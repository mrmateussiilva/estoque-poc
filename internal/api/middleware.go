package api

import (
	"context"
	"estoque/internal/models"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

var JwtSecret []byte

type contextKey string

const (
	UserContextKey contextKey = "user"
	RoleContextKey contextKey = "role"
	IDContextKey   contextKey = "user_id"
)

// InitJwtSecret inicializa o JWT secret a partir de variável de ambiente
func InitJwtSecret() error {
	secret := os.Getenv("JWT_SECRET")
	env := os.Getenv("ENV")

	if secret == "" {
		if env == "production" {
			slog.Error("JWT_SECRET é obrigatório em ambiente de produção!")
			return ErrInvalidJwtSecret
		}
		// Fallback para desenvolvimento apenas (não usar em produção)
		secret = "sge-secret-key-change-in-production-must-be-long"
		slog.Warn("JWT_SECRET não definido, usando valor padrão (NÃO SEGURO PARA PRODUÇÃO)")
	}

	if len(secret) < 32 {
		slog.Error("JWT_SECRET deve ter pelo menos 32 caracteres", "length", len(secret))
		return ErrInvalidJwtSecret
	}

	JwtSecret = []byte(secret)
	return nil
}

// AuthMiddleware is a Chi-compatible middleware for JWT authentication
func AuthMiddleware(db *gorm.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				RespondWithError(w, http.StatusUnauthorized, "Cabeçalho de autorização ausente")
				return
			}

			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			claims := &models.Claims{}
			token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
				return JwtSecret, nil
			})

			if err != nil || !token.Valid {
				RespondWithError(w, http.StatusUnauthorized, "Token inválido ou expirado")
				return
			}

			// Injetar informações do token no contexto SEM consultar o banco
			ctx := context.WithValue(r.Context(), IDContextKey, claims.UserID)
			ctx = context.WithValue(ctx, RoleContextKey, claims.Role)
			ctx = context.WithValue(ctx, "user_email", claims.Email)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RoleMiddleware verifica se o usuário tem uma das roles permitidas baseado no JWT
func RoleMiddleware(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := GetRole(r)
			if role == "" {
				RespondWithError(w, http.StatusUnauthorized, "Não autorizado")
				return
			}

			hasRole := false
			for _, r := range allowedRoles {
				if role == r {
					hasRole = true
					break
				}
			}

			if !hasRole {
				slog.Warn("Acesso negado por permissão insuficiente", "role", role, "required", allowedRoles)
				RespondWithError(w, http.StatusForbidden, "Permissão insuficiente")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// Helper functions para acessar dados do contexto

func GetUserID(r *http.Request) (int32, bool) {
	id, ok := r.Context().Value(IDContextKey).(int32)
	return id, ok
}

func GetRole(r *http.Request) string {
	role, ok := r.Context().Value(RoleContextKey).(string)
	if !ok {
		return ""
	}
	return role
}

// GetUserFromContext agora busca do banco APENAS quando explicitamente chamado
func GetUserFromContext(r *http.Request, db *gorm.DB) (*models.User, bool) {
	userID, ok := GetUserID(r)
	if !ok {
		return nil, false
	}

	var user models.User
	if err := db.First(&user, userID).Error; err != nil {
		return nil, false
	}

	return &user, true
}

// LoggerMiddleware é um middleware para logs estruturados com slog
func LoggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrapper para capturar o status code
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

		next.ServeHTTP(ww, r)

		latency := time.Since(start)

		slog.Info("Request",
			"request_id", middleware.GetReqID(r.Context()),
			"method", r.Method,
			"path", r.URL.Path,
			"status", ww.Status(),
			"latency_ms", latency.Milliseconds(),
			"ip", r.RemoteAddr,
		)
	})
}
