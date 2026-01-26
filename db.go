package estoquepoc

import "database/sql"

func setupDatabase(db *sql.DB) error {
	queries := []string{
		`
		CREATE TABLE IF NOT EXISTS products (
			code TEXT PRIMARY KEY,
			name TEXT
		);
		`,
		`
		CREATE TABLE IF NOT EXISTS stock (
			product_code TEXT PRIMARY KEY,
			quantity NUMERIC
		);
		`,
	}

	for _, q := range queries {
		_, err := db.Exec(q)
		if err != nil {
			return err
		}
	}

	return nil
}
