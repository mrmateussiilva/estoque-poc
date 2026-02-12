package api

import (
	"encoding/json"
	"estoque/internal/models"
	"estoque/internal/services"
	"log/slog"
	"net/http"
	"strconv"
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
	var req models.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validar dados usando service
	if err := services.ValidateUserRequest(req.Email, req.Password); err != nil {
		HandleError(w, NewAppError(http.StatusBadRequest, err.Error(), err), "Erro de validação")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error hashing password")
		return
	}

	user := models.User{
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashedPassword),
		Role:     req.Role,
		Active:   true,
	}

	if err := h.DB.Create(&user).Error; err != nil {
		if strings.Contains(err.Error(), "Duplicate entry") {
			HandleError(w, NewAppError(http.StatusConflict, "Já existe um usuário com este email", err), "Erro ao criar usuário")
			return
		}
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao criar usuário", err), "Erro ao criar usuário")
		return
	}

	// Log estruturado
	slog.Info("Usuário criado",
		"user_id", user.ID,
		"user_email", user.Email,
		"user_role", user.Role,
	)

	// Registrar no audit log
	authUser, _ := GetUserFromContext(r, h.DB)
	var authUserID *int32
	if authUser != nil {
		authUserID = &authUser.ID
	}
	userIDStr := strconv.FormatInt(int64(user.ID), 10)
	LogAuditAction(h.DB, r, authUserID, "CREATE", "user", userIDStr,
		"Usuário criado",
		nil,
		map[string]interface{}{
			"email": user.Email,
			"role":  user.Role,
		},
	)

	RespondWithJSON(w, http.StatusCreated, user)
}

func (h *Handler) UpdateUserHandler(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/users/")
	if idStr == "" {
		RespondWithError(w, http.StatusBadRequest, "User ID is required")
		return
	}

	var req models.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var user models.User
	if err := h.DB.First(&user, idStr).Error; err != nil {
		HandleError(w, ErrUserNotFound, "Erro ao buscar usuário")
		return
	}

	// Salvar valores antigos para audit log
	oldValues := map[string]interface{}{
		"name":   user.Name,
		"email":  user.Email,
		"role":   user.Role,
		"active": user.Active,
	}

	// Se houver nova senha, fazer o hash
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Error hashing password")
			return
		}
		user.Password = string(hashedPassword)
	}

	// Atualizar outros campos
	if req.Name != nil {
		user.Name = req.Name
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Role != "" {
		user.Role = req.Role
	}
	if req.Active != nil {
		user.Active = *req.Active
	}

	if err := h.DB.Save(&user).Error; err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Erro ao atualizar usuário")
		return
	}

	// Registrar no audit log
	auditUser, _ := GetUserFromContext(r, h.DB)
	var authUserID *int32
	if auditUser != nil {
		authUserID = &auditUser.ID
	}
	LogAuditAction(h.DB, r, authUserID, "UPDATE", "user", idStr,
		"Usuário atualizado",
		oldValues,
		map[string]interface{}{
			"name":   user.Name,
			"email":  user.Email,
			"role":   user.Role,
			"active": user.Active,
		},
	)

	RespondWithJSON(w, http.StatusOK, user)
}

func (h *Handler) DeleteUserHandler(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/users/")
	if idStr == "" {
		RespondWithError(w, http.StatusBadRequest, "User ID is required")
		return
	}

	// Buscar usuário antes de inativar (para audit log)
	var user models.User
	if err := h.DB.First(&user, idStr).Error; err != nil {
		HandleError(w, ErrUserNotFound, "Erro ao buscar usuário")
		return
	}

	// Inativar usuário em vez de excluir fisicamente (melhor prática)
	if err := h.DB.Model(&models.User{}).Where("id = ?", idStr).Update("active", false).Error; err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Erro ao inativar usuário")
		return
	}

	// Registrar no audit log
	auditUser, _ := GetUserFromContext(r, h.DB)
	var userID *int32
	if auditUser != nil {
		userID = &auditUser.ID
	}
	LogAuditAction(h.DB, r, userID, "DELETE", "user", idStr,
		"Usuário inativado",
		map[string]interface{}{"active": true},
		map[string]interface{}{"active": false},
	)

	w.WriteHeader(http.StatusNoContent)
}
