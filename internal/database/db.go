package database

import (
	"database/sql"
	"log/slog"

	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
)

var DB *sql.DB

func InitDB(dataSourceName string) (*sql.DB, error) {
	// Se a string de conexão começar com ./, provavelmente estamos tentando usar SQLite.
	// No MySQL, precisamos de um DSN formatado. 
	// Para compatibilidade, se não for passado um DSN MySQL, tentamos montar um.
	db, err := sql.Open("mysql", dataSourceName)
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
			id INT PRIMARY KEY AUTO_INCREMENT,
			name VARCHAR(191) NOT NULL UNIQUE,
			parent_id INT,
			FOREIGN KEY (parent_id) REFERENCES categories(id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		
		// Tabela de fornecedores
		`CREATE TABLE IF NOT EXISTS suppliers (
			id INT PRIMARY KEY AUTO_INCREMENT,
			name VARCHAR(191) NOT NULL,
			cnpj VARCHAR(20) UNIQUE,
			email VARCHAR(191),
			phone VARCHAR(20),
			address TEXT,
			active BOOLEAN DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		
		// Tabela de produtos expandida
		`CREATE TABLE IF NOT EXISTS products (
			code VARCHAR(191) PRIMARY KEY,
			name VARCHAR(191) NOT NULL,
			description TEXT,
			category_id INT,
			unit VARCHAR(20) DEFAULT 'UN',
			barcode VARCHAR(191) UNIQUE,
			cost_price DECIMAL(19,4) DEFAULT 0,
			sale_price DECIMAL(19,4) DEFAULT 0,
			min_stock DECIMAL(19,4) DEFAULT 0,
			max_stock DECIMAL(19,4),
			location VARCHAR(191),
			supplier_id INT,
			active BOOLEAN DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			FOREIGN KEY (category_id) REFERENCES categories(id),
			FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		
		// Tabela de estoque
		`CREATE TABLE IF NOT EXISTS stock (
			product_code VARCHAR(191) PRIMARY KEY,
			quantity DECIMAL(19,4) DEFAULT 0,
			FOREIGN KEY (product_code) REFERENCES products(code)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		
		// Tabela de usuários expandida
		`CREATE TABLE IF NOT EXISTS users (
			id INT PRIMARY KEY AUTO_INCREMENT,
			name VARCHAR(191),
			email VARCHAR(191) UNIQUE NOT NULL,
			password VARCHAR(191) NOT NULL,
			role ENUM('ADMIN', 'GERENTE', 'OPERADOR', 'VISUALIZADOR') DEFAULT 'OPERADOR',
			active BOOLEAN DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

		// Tabela de movimentações
		`CREATE TABLE IF NOT EXISTS movements (
			id INT PRIMARY KEY AUTO_INCREMENT,
			product_code VARCHAR(191) NOT NULL,
			type ENUM('ENTRADA', 'SAIDA') NOT NULL,
			quantity DECIMAL(19,4) NOT NULL,
			origin VARCHAR(191),
			reference VARCHAR(191),
			user_id INT,
			notes TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (product_code) REFERENCES products(code),
			FOREIGN KEY (user_id) REFERENCES users(id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		
		// Tabela de NF-es processadas
		`CREATE TABLE IF NOT EXISTS processed_nfes (
			access_key VARCHAR(191) PRIMARY KEY,
			number VARCHAR(50),
			supplier_name VARCHAR(191),
			total_items INT,
			processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
	}

	for _, q := range queries {
		if _, err := DB.Exec(q); err != nil {
			slog.Error("Failed to create table", "query", q, "error", err)
			// Não saímos do programa se falhar, talvez as tabelas já existam com tipos diferentes
			// ou o MySQL 5.6 tenha alguma restrição de sintaxe.
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
		return
	}

	if count == 0 {
		hashed, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			slog.Error("Failed to hash default password", "error", err)
			return
		}
		_, err = DB.Exec("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", 
			"Administrador", "admin@sge.com", string(hashed), "ADMIN")
		if err != nil {
			slog.Error("Failed to insert default user", "error", err)
		} else {
			slog.Info("Default user created", "email", "admin@sge.com")
		}
	}
}

func seedCategories() {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM categories").Scan(&count)
	if err != nil {
		slog.Error("Failed to count categories", "error", err)
		return
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
			_, err = DB.Exec("INSERT IGNORE INTO categories (name) VALUES (?)", cat)
			if err != nil {
				slog.Warn("Failed to insert category", "category", cat, "error", err)
			}
		}
		slog.Info("Default categories created", "count", len(categories))
	}
}

