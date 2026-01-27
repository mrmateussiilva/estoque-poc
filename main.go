package main

import (
	"database/sql"
	"encoding/json"
	"encoding/xml"
	"log"
	"net/http"

	_ "github.com/mattn/go-sqlite3"
)

// Estruturas XML
type NfeProc struct {
	XMLName xml.Name `xml:"nfeProc"`
	NFe     NFe      `xml:"NFe"`
}

type NFe struct {
	InfNFe InfNFe `xml:"infNFe"`
}

type InfNFe struct {
	Det []Det `xml:"det"`
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

var db *sql.DB

func main() {
	var err error
	// Conexão SQLite
	db, err = sql.Open("sqlite3", "./estoque.db")
	if err != nil {
		log.Fatal(err)
	}

	if err = db.Ping(); err != nil {
		log.Fatal(err)
	}

	// Criação das tabelas
	createTables()

	// Frontend
	http.Handle("/", http.FileServer(http.Dir("./static")))

	// Endpoints
	http.HandleFunc("/nfe/upload", uploadHandler)
	http.HandleFunc("/stock", stockHandler)

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
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
	}

	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			log.Fatal(err)
		}
	}
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse multipart form
	// Limite de 10MB
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "Error parsing form", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "File not found (key 'file' required)", http.StatusBadRequest)
		return
	}
	defer file.Close()

	var proc NfeProc
	if err := xml.NewDecoder(file).Decode(&proc); err != nil {
		http.Error(w, "Error decoding XML", http.StatusBadRequest)
		return
	}

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	for _, det := range proc.NFe.InfNFe.Det {
		// 1. Inserir Produto
		_, err = tx.Exec(`
			INSERT OR IGNORE INTO products (code, name) 
			VALUES ($1, $2)`,
			det.Prod.CProd, det.Prod.XProd,
		)
		if err != nil {
			http.Error(w, "Error inserting product", http.StatusInternalServerError)
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
			http.Error(w, "Error updating stock", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Commit error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Upload successful"))
}

func stockHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := db.Query(`
		SELECT p.code, p.name, s.quantity 
		FROM stock s 
		JOIN products p ON s.product_code = p.code
	`)
	if err != nil {
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var list []StockItem
	for rows.Next() {
		var item StockItem
		if err := rows.Scan(&item.Code, &item.Name, &item.Quantity); err != nil {
			log.Println("Scan error:", err)
			continue
		}
		list = append(list, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}
