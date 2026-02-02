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
		// Tabela de categorias
		`CREATE TABLE IF NOT EXISTS categories (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			parent_id INTEGER,
			FOREIGN KEY (parent_id) REFERENCES categories(id)
		)`,
		
		// Tabela de fornecedores
		`CREATE TABLE IF NOT EXISTS suppliers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			cnpj TEXT UNIQUE,
			email TEXT,
			phone TEXT,
			address TEXT,
			active BOOLEAN DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		
		// Tabela de produtos expandida
		`CREATE TABLE IF NOT EXISTS products (
			code TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT,
			category_id INTEGER,
			unit TEXT DEFAULT 'UN',
			barcode TEXT UNIQUE,
			cost_price NUMERIC DEFAULT 0,
			sale_price NUMERIC DEFAULT 0,
			min_stock NUMERIC DEFAULT 0,
			max_stock NUMERIC,
			location TEXT,
			supplier_id INTEGER,
			active BOOLEAN DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (category_id) REFERENCES categories(id),
			FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
		)`,
		
		// Tabela de estoque (mantida para compatibilidade)
		`CREATE TABLE IF NOT EXISTS stock (
			product_code TEXT PRIMARY KEY,
			quantity NUMERIC DEFAULT 0,
			FOREIGN KEY (product_code) REFERENCES products(code)
		)`,
		
		// Tabela de movimentações (NOVA - essencial para rastreabilidade)
		`CREATE TABLE IF NOT EXISTS movements (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			product_code TEXT NOT NULL,
			type TEXT NOT NULL CHECK(type IN ('ENTRADA', 'SAIDA')),
			quantity NUMERIC NOT NULL,
			origin TEXT,
			reference TEXT,
			user_id INTEGER,
			notes TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (product_code) REFERENCES products(code),
			FOREIGN KEY (user_id) REFERENCES users(id)
		)`,
		
		// Tabela de NF-es processadas
		`CREATE TABLE IF NOT EXISTS processed_nfes (
			access_key TEXT PRIMARY KEY,
			number TEXT,
			supplier_name TEXT,
			total_items INTEGER,
			processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		
		// Tabela de usuários expandida
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT,
			email TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL,
			role TEXT DEFAULT 'OPERADOR' CHECK(role IN ('ADMIN', 'GERENTE', 'OPERADOR', 'VISUALIZADOR')),
			active BOOLEAN DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		
		// Índices para performance
		`CREATE INDEX IF NOT EXISTS idx_movements_product ON movements(product_code)`,
		`CREATE INDEX IF NOT EXISTS idx_movements_created ON movements(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_movements_type ON movements(type)`,
		`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`,
		`CREATE INDEX IF NOT EXISTS idx_products_active ON products(active)`,
	}

	for _, q := range queries {
		if _, err := DB.Exec(q); err != nil {
			slog.Error("Failed to create table", "query", q, "error", err)
			os.Exit(1)
		}
	}

	seedUser()
	seedCategories()
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
		_, err = DB.Exec("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", 
			"Administrador", "admin@sge.com", string(hashed), "ADMIN")
		if err != nil {
			slog.Error("Failed to insert default user", "error", err)
			os.Exit(1)
		}
		slog.Info("Default user created", "email", "admin@sge.com")
	}
}

func seedCategories() {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM categories").Scan(&count)
	if err != nil {
		slog.Error("Failed to count categories", "error", err)
		os.Exit(1)
	}

	if count == 0 {
		categories := []string{
			"Eletrônicos",
			"Informática",
			"Escritório",
			"Ferramentas",
			"Outros",
		}
		
		for _, cat := range categories {
			_, err = DB.Exec("INSERT INTO categories (name) VALUES (?)", cat)
			if err != nil {
				slog.Warn("Failed to insert category", "category", cat, "error", err)
			}
		}
		slog.Info("Default categories created", "count", len(categories))
	}
}
