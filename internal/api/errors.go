package api

import (
	"errors"
	"log/slog"
	"net/http"
	"os"
)

// Erros customizados do sistema
var (
	ErrInvalidJwtSecret     = errors.New("JWT_SECRET inválido")
	ErrUserNotFound         = errors.New("usuário não encontrado")
	ErrInsufficientStock    = errors.New("estoque insuficiente")
	ErrProductNotFound      = errors.New("produto não encontrado")
	ErrDuplicateNFe         = errors.New("NF-e já processada")
	ErrInvalidInput         = errors.New("dados de entrada inválidos")
	ErrUnauthorized         = errors.New("não autorizado")
	ErrForbidden            = errors.New("permissão insuficiente")
	ErrInternalServer       = errors.New("erro interno do servidor")
)

// AppError representa um erro da aplicação com código HTTP e mensagem amigável
type AppError struct {
	Code       int    // Código HTTP
	Message    string // Mensagem amigável para o usuário
	Internal   error  // Erro interno (não exposto ao usuário)
	LogContext map[string]interface{}
}

func (e *AppError) Error() string {
	return e.Message
}

// HandleError processa erros e retorna resposta apropriada
func HandleError(w http.ResponseWriter, err error, defaultMessage string) {
	// Se for um AppError, usar suas informações
	if appErr, ok := err.(*AppError); ok {
		if appErr.LogContext != nil {
			slog.Error("Erro da aplicação", 
				"message", appErr.Message,
				"code", appErr.Code,
				"internal", appErr.Internal,
				"context", appErr.LogContext)
		} else {
			slog.Error("Erro da aplicação", 
				"message", appErr.Message,
				"code", appErr.Code,
				"internal", appErr.Internal)
		}
		RespondWithError(w, appErr.Code, appErr.Message)
		return
	}

	// Mapear erros conhecidos
	switch err {
	case ErrInvalidJwtSecret:
		RespondWithError(w, http.StatusInternalServerError, "Configuração de segurança inválida")
	case ErrUserNotFound:
		RespondWithError(w, http.StatusNotFound, "Usuário não encontrado")
	case ErrInsufficientStock:
		RespondWithError(w, http.StatusBadRequest, "Estoque insuficiente")
	case ErrProductNotFound:
		RespondWithError(w, http.StatusNotFound, "Produto não encontrado")
	case ErrDuplicateNFe:
		RespondWithError(w, http.StatusConflict, "Esta NF-e já foi processada anteriormente")
	case ErrInvalidInput:
		RespondWithError(w, http.StatusBadRequest, "Dados de entrada inválidos")
	case ErrUnauthorized:
		RespondWithError(w, http.StatusUnauthorized, "Não autorizado")
	case ErrForbidden:
		RespondWithError(w, http.StatusForbidden, "Permissão insuficiente")
	default:
		// Em produção, não expor detalhes do erro interno
		isProduction := os.Getenv("ENV") == "production"
		if isProduction {
			slog.Error("Erro interno", "error", err, "message", defaultMessage)
			RespondWithError(w, http.StatusInternalServerError, defaultMessage)
		} else {
			// Em desenvolvimento, mostrar mais detalhes
			slog.Error("Erro interno", "error", err)
			RespondWithError(w, http.StatusInternalServerError, defaultMessage+": "+err.Error())
		}
	}
}

// NewAppError cria um novo AppError
func NewAppError(code int, message string, internal error) *AppError {
	return &AppError{
		Code:     code,
		Message:  message,
		Internal: internal,
	}
}

// NewAppErrorWithContext cria um novo AppError com contexto para logs
func NewAppErrorWithContext(code int, message string, internal error, context map[string]interface{}) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		Internal:   internal,
		LogContext: context,
	}
}
