package api

import (
	"encoding/json"
	"estoque/internal/models"
	"net/http"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

func (h *Handler) ListUsersHandler(w http.ResponseWriter, r *http.Request) {
	var users []models.User
	if err := h.DB.Order("name ASC").Find(&users).Error; err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao buscar usuários", err), "Erro ao buscar usuários")
		return
	}
	RespondWithJSON(w, http.StatusOK, users)
}

func (h *Handler) CreateUserHandler(w http.ResponseWriter, r *http.Request) {
	var req models.User
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		RespondWithError(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error hashing password")
		return
	}
	req.Password = string(hashedPassword)
	req.Active = true

	if err := h.DB.Create(&req).Error; err != nil {
		if strings.Contains(err.Error(), "Duplicate entry") {
			HandleError(w, NewAppError(http.StatusConflict, "Já existe um usuário com este email", err), "Erro ao criar usuário")
			return
		}
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao criar usuário", err), "Erro ao criar usuário")
		return
	}

	RespondWithJSON(w, http.StatusCreated, req)
}

func (h *Handler) UpdateUserHandler(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/users/")
	if idStr == "" {
		RespondWithError(w, http.StatusBadRequest, "User ID is required")
		return
	}

	var req models.User
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var user models.User
	if err := h.DB.First(&user, idStr).Error; err != nil {
		HandleError(w, ErrUserNotFound, "Erro ao buscar usuário")
		return
	}

	// Se houver nova senha, fazer o hash
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Error hashing password")
			return
		}
		req.Password = string(hashedPassword)
	} else {
		req.Password = user.Password // Manter a senha antiga se não enviada
	}

	if err := h.DB.Model(&user).Updates(req).Error; err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error updating user")
		return
	}

	RespondWithJSON(w, http.StatusOK, user)
}

func (h *Handler) DeleteUserHandler(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/users/")
	if idStr == "" {
		RespondWithError(w, http.StatusBadRequest, "User ID is required")
		return
	}

	// Inativar usuário em vez de excluir fisicamente (melhor prática)
	if err := h.DB.Model(&models.User{}).Where("id = ?", idStr).Update("active", false).Error; err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error deactivating user")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
