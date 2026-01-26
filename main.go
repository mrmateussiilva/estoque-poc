package main

import (
	"database/sql"
	"log"
	"net/http"
)

var db *sql.DB

func main() {
	var err error
	db, err = sql.Open("postgres", "postgres://postgres:postgres@localhost:5432/estoque_poc?sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}

	err = setupDatabase(db)
	if err != nil {
		log.Fatal("erro ao criar tabelas:", err)
	}
	log.Println("Banco pronto ✔️")

	http.HandleFunc("/nfe/upload", uploadNFe)
	http.HandleFunc("/stock", getStock)

	log.Println("API rodando na porta 8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
