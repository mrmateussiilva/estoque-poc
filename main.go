package main

import (
	"database/sql"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte("sge-secret-key-change-in-production")

// Estruturas XML
type NfeProc struct {
	XMLName xml.Name `xml:"nfeProc"`
	NFe     NFe      `xml:"NFe"`
}

type NFe struct {
	InfNFe InfNFe `xml:"infNFe"`
}

type InfNFe struct {
	ID  string `xml:"Id,attr"`
	Det []Det  `xml:"det"`
}

type Det struct {
	Prod Prod `xml:"prod"`
}

type Prod struct {
	CProd string  `xml:"cProd"`
	XProd string  `xml:"xProd"`
	QCom  float64 `xml:"qCom"`
}

// Estrutura JSON
type StockItem struct {
	Code     string  `json:"code"`
	Name     string  `json:"name"`
	Quantity float64 `json:"quantity"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
}

type Claims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

var db *sql.DB

func main() {
	// Configuração do Logger Estruturado
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})
	logger := slog.New(handler)
	slog.SetDefault(logger)

	var err error
	// Conexão SQLite
	db, err = sql.Open("sqlite3", "./estoque.db")
	if err != nil {
		slog.Error("Failed to connect to database", "error", err)
		os.Exit(1)
	}

	if err = db.Ping(); err != nil {
		slog.Error("Database ping failed", "error", err)
		os.Exit(1)
	}

	// Criação das tabelas
	createTables()

	// Frontend
	http.Handle("/", http.FileServer(http.Dir("./static")))

	// Endpoints com Middleware de Log e CORS
	http.HandleFunc("/login", loggingMiddleware(corsMiddleware(loginHandler)))
	http.HandleFunc("/nfe/upload", loggingMiddleware(corsMiddleware(authMiddleware(uploadHandler))))
	http.HandleFunc("/stock", loggingMiddleware(corsMiddleware(authMiddleware(stockHandler))))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8003"
	}

	slog.Info("Server starting", "port", port, "env", "production")

	srv := &http.Server{
		Addr:         ":" + port,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  30 * time.Second,
	}

	if err := srv.ListenAndServe(); err != nil {
		slog.Error("Server failed", "error", err)
		os.Exit(1)
	}
}

// respondWithError envia uma resposta de erro JSON
func respondWithError(w http.ResponseWriter, code int, message string) {
	respondWithJSON(w, code, map[string]string{"error": message})
}

// respondWithJSON envia uma resposta JSON genérica
func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, err := json.Marshal(payload)
	if err != nil {
		slog.Error("Error marshalling JSON", "error", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

func createTables() {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS products (
			code TEXT PRIMARY KEY,
			name TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS stock (
			product_code TEXT PRIMARY KEY,
			quantity NUMERIC
		)`,
		`CREATE TABLE IF NOT EXISTS processed_nfes (
			access_key TEXT PRIMARY KEY,
			processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL
		)`,
	}

	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			slog.Error("Failed to create table", "query", q, "error", err)
			os.Exit(1)
		}
	}

	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		slog.Error("Failed to count users", "error", err)
		os.Exit(1)
	}

	if count == 0 {
		hashed, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			slog.Error("Failed to hash default password", "error", err)
			os.Exit(1)
		}
		_, err = db.Exec("INSERT INTO users (email, password) VALUES (?, ?)", "admin@sge.com", string(hashed))
		if err != nil {
			slog.Error("Failed to insert default user", "error", err)
			os.Exit(1)
		}
		slog.Info("Default user created", "email", "admin@sge.com")
	}
}

// responseWriterInterceptor captura o status code para o log
type responseWriterInterceptor struct {
	http.ResponseWriter
	statusCode int
}

func (w *responseWriterInterceptor) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}

func loggingMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Interceptar o status code
		wi := &responseWriterInterceptor{ResponseWriter: w, statusCode: http.StatusOK}

		next(wi, r)

		duration := time.Since(start)

		slog.Info("API Request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", wi.statusCode,
			"duration", duration.String(),
			"ip", r.RemoteAddr,
		)
	}
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
		if allowedOrigin == "" {
			allowedOrigin = "*"
		}

		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respondWithError(w, http.StatusUnauthorized, "Missing authorization header")
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			respondWithError(w, http.StatusUnauthorized, "Invalid authorization format")
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			respondWithError(w, http.StatusUnauthorized, "Invalid token")
			return
		}

		next(w, r)
	}
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var storedPassword string
	err := db.QueryRow("SELECT password FROM users WHERE email = ?", req.Email).Scan(&storedPassword)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(req.Password)); err != nil {
		respondWithError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Email: req.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error generating token")
		return
	}

	respondWithJSON(w, http.StatusOK, LoginResponse{Token: tokenString})
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Parse multipart form
	// Limite de 10MB
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respondWithError(w, http.StatusBadRequest, "Error parsing form: "+err.Error())
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "File not found (key 'file' required): "+err.Error())
		return
	}
	defer file.Close()

	var proc NfeProc
	if err := xml.NewDecoder(file).Decode(&proc); err != nil {
		respondWithError(w, http.StatusBadRequest, "Error decoding XML: "+err.Error())
		return
	}

	tx, err := db.Begin()
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "DB Error (beginning transaction): "+err.Error())
		return
	}
	defer tx.Rollback()

	// 0. Verificar se NF-e já foi processada
	var exists bool
	err = tx.QueryRow("SELECT EXISTS(SELECT 1 FROM processed_nfes WHERE access_key = $1)", proc.NFe.InfNFe.ID).Scan(&exists)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error checking duplicate NFe: "+err.Error())
		return
	}
	if exists {
		respondWithError(w, http.StatusConflict, "Esta NF-e já foi processada anteriormente")
		return
	}

	// Registrar a NF-e
	_, err = tx.Exec("INSERT INTO processed_nfes (access_key) VALUES ($1)", proc.NFe.InfNFe.ID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error registering NFe: "+err.Error())
		return
	}

	for _, det := range proc.NFe.InfNFe.Det {
		// 1. Inserir Produto
		_, err = tx.Exec(`
			INSERT OR IGNORE INTO products (code, name) 
			VALUES ($1, $2)`,
			det.Prod.CProd, det.Prod.XProd,
		)
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, "Error inserting product: "+err.Error())
			return
		}

		// 2. Atualizar Estoque
		_, err = tx.Exec(`
			INSERT INTO stock (product_code, quantity) 
			VALUES ($1, $2)
			ON CONFLICT (product_code) 
			DO UPDATE SET quantity = quantity + excluded.quantity`,
			det.Prod.CProd, det.Prod.QCom,
		)
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, "Error updating stock: "+err.Error())
			return
		}
	}

	if err := tx.Commit(); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Commit error: "+err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Upload successful"))
}

func stockHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	rows, err := db.Query(`
		SELECT p.code, p.name, s.quantity 
		FROM stock s 
		JOIN products p ON s.product_code = p.code
	`)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "DB Error (querying stock): "+err.Error())
		return
	}
	defer rows.Close()

	var list []StockItem
	for rows.Next() {
		var item StockItem
		if err := rows.Scan(&item.Code, &item.Name, &item.Quantity); err != nil {
			slog.Warn("Scan error", "error", err)
			continue
		}
		list = append(list, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}
