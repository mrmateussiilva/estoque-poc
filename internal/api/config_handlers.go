package api

import (
	"encoding/json"
	"estoque/internal/models"
	"fmt"
	"log/slog"
	"net"
	"net/http"

	"github.com/emersion/go-imap/client"
)

// GetEmailConfigHandler retorna a configuração de e-mail atual
func (h *Handler) GetEmailConfigHandler(w http.ResponseWriter, r *http.Request) {
	var config models.EmailConfig
	// Busca a primeira configuração (considerando que só temos uma para o sistema todo)
	if err := h.DB.First(&config).Error; err != nil {
		// Se não existir, retorna defaults comuns para facilitar o setup
		config = models.EmailConfig{
			IMAPPort:   993,
			UseTLS:     true,
			IMAPFolder: "INBOX",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(config)
		return
	}

	// Não retornar a senha em texto claro
	config.IMAPPassword = "********"

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

// UpdateEmailConfigHandler cria ou atualiza a configuração de e-mail
func (h *Handler) UpdateEmailConfigHandler(w http.ResponseWriter, r *http.Request) {
	var req models.EmailConfig
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Corpo da requisição inválido")
		return
	}

	var configs []models.EmailConfig
	h.DB.Limit(1).Find(&configs)

	if len(configs) == 0 {
		// Criar nova
		if err := h.DB.Create(&req).Error; err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Erro ao criar configuração")
			return
		}
	} else {
		config := configs[0]
		isNewPassword := req.IMAPPassword != "********"

		// Se a senha enviada for "********", mantemos a atual
		if !isNewPassword {
			req.IMAPPassword = config.IMAPPassword
		}

		// Garante que o ID e metadados sejam preservados para o Save
		req.ID = config.ID
		req.CreatedAt = config.CreatedAt

		// Usar Save para garantir que TODOS os campos sejam atualizados (incluindo booleans false)
		if err := h.DB.Save(&req).Error; err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Erro ao atualizar configuração")
			return
		}

		if isNewPassword {
			slog.Info("Configuração de e-mail atualizada com NOVA senha")
		} else {
			slog.Info("Configuração de e-mail atualizada (mantendo senha atual)")
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Configuração salva com sucesso"})
}

// TestEmailConnectionHandler testa a conexão com o servidor IMAP
func (h *Handler) TestEmailConnectionHandler(w http.ResponseWriter, r *http.Request) {
	var req models.EmailConfig
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Corpo da requisição inválido")
		return
	}

	// Se for teste de uma configuração existente e a senha for "********"
	if req.IMAPPassword == "********" {
		var existing models.EmailConfig
		if err := h.DB.First(&existing).Error; err == nil {
			req.IMAPPassword = existing.IMAPPassword
		}
	}

	// Tenta conectar
	addr := net.JoinHostPort(req.IMAPHost, fmt.Sprintf("%d", req.IMAPPort))
	var c *client.Client
	var err error

	if req.UseTLS {
		c, err = client.DialTLS(addr, nil)
	} else {
		c, err = client.Dial(addr)
	}

	if err != nil {
		RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("Erro de conexão: %v", err))
		return
	}
	defer c.Logout()

	// Tenta login
	if err := c.Login(req.IMAPUser, req.IMAPPassword); err != nil {
		RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("Erro de login: %v", err))
		return
	}

	// Tenta selecionar a pasta
	if _, err := c.Select(req.IMAPFolder, true); err != nil {
		RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("Erro ao abrir pasta: %v", err))
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Conexão estabelecida com sucesso!"})
}
