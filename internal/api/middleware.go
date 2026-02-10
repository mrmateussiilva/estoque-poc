package api

import (
	"context"
	"estoque/internal/models"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

var JwtSecret []byte

// InitJwtSecret inicializa o JWT secret a partir de variável de ambiente
func InitJwtSecret() error {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Fallback para desenvolvimento apenas (não usar em produção)
		secret = "sge-secret-key-change-in-production"
		slog.Warn("JWT_SECRET não definido, usando valor padrão (NÃO SEGURO PARA PRODUÇÃO)")
	}
	
	if len(secret) < 32 {
		slog.Error("JWT_SECRET deve ter pelo menos 32 caracteres")
		return ErrInvalidJwtSecret
	}
	
	JwtSecret = []byte(secret)
	return nil
}

// AuthMiddleware is a Chi-compatible middleware for JWT authentication
// Também injeta o usuário no contexto da requisição
func AuthMiddleware(db *gorm.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Pular autenticação para requisições OPTIONS (CORS Preflight)
			// O middleware de CORS já trata essas requisições
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
			if tokenString == authHeader {
				RespondWithError(w, http.StatusUnauthorized, "Formato de autorização inválido")
				return
			}

			claims := &models.Claims{}
			token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
				return JwtSecret, nil
			})

			if err != nil || !token.Valid {
				RespondWithError(w, http.StatusUnauthorized, "Token inválido ou expirado")
				return
			}

			// Buscar usuário do banco e injetar no contexto
			var user models.User
			if err := db.Where("email = ?", claims.Email).First(&user).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					RespondWithError(w, http.StatusUnauthorized, "Usuário não encontrado")
					return
				}
				slog.Error("Erro ao buscar usuário", "email", claims.Email, "error", err)
				RespondWithError(w, http.StatusInternalServerError, "Erro interno do servidor")
				return
			}

			if !user.Active {
				RespondWithError(w, http.StatusUnauthorized, "Usuário inativo")
				return
			}

			// Injetar usuário no contexto
			ctx := context.WithValue(r.Context(), "user", &user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RoleMiddleware verifica se o usuário tem uma das roles permitidas
func RoleMiddleware(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, ok := r.Context().Value("user").(*models.User)
			if !ok || user == nil {
				RespondWithError(w, http.StatusUnauthorized, "Usuário não autenticado")
				return
			}

			// Verificar se o usuário tem uma das roles permitidas
			hasRole := false
			for _, role := range allowedRoles {
				if user.Role == role {
					hasRole = true
					break
				}
			}

			if !hasRole {
				slog.Warn("Acesso negado por falta de permissão", 
					"user_email", user.Email, 
					"user_role", user.Role, 
					"required_roles", allowedRoles)
				RespondWithError(w, http.StatusForbidden, "Permissão insuficiente")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// GetUserFromContext extrai o usuário do contexto da requisição
func GetUserFromContext(r *http.Request) (*models.User, bool) {
	user, ok := r.Context().Value("user").(*models.User)
	return user, ok
}
