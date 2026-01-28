package database

import (
	"database/sql"
	"log/slog"
	"os"

	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

var DB *sql.DB

func InitDB(dataSourceName string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", dataSourceName)
	if err != nil {
		return nil, err
	}

	if err = db.Ping(); err != nil {
		return nil, err
	}

	DB = db
	CreateTables()
	return db, nil
}

func CreateTables() {
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
		if _, err := DB.Exec(q); err != nil {
			slog.Error("Failed to create table", "query", q, "error", err)
			os.Exit(1)
		}
	}

	seedUser()
}

func seedUser() {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
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
		_, err = DB.Exec("INSERT INTO users (email, password) VALUES (?, ?)", "admin@sge.com", string(hashed))
		if err != nil {
			slog.Error("Failed to insert default user", "error", err)
			os.Exit(1)
		}
		slog.Info("Default user created", "email", "admin@sge.com")
	}
}
