package api

import (
	"estoque/internal/models"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

var JwtSecret = []byte("sge-secret-key-change-in-production")

// AuthMiddleware is a Chi-compatible middleware for JWT authentication
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			RespondWithError(w, http.StatusUnauthorized, "Missing authorization header")
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			RespondWithError(w, http.StatusUnauthorized, "Invalid authorization format")
			return
		}

		claims := &models.Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return JwtSecret, nil
		})

		if err != nil || !token.Valid {
			RespondWithError(w, http.StatusUnauthorized, "Invalid token")
			return
		}

		// Aqui poderíamos injetar o usuário no contexto do request
		next.ServeHTTP(w, r)
	})
}
