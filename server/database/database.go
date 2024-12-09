package database

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB

func InitDB() error {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./database/db.sqlite" // fallback default
		log.Printf("No DB_PATH environment variable found, using default: %s", dbPath)
	}

	var err error
	db, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Printf("Failed to open database: %v", err)
		return err
	}
	log.Printf("Successfully connected to database at %s", dbPath)

	// Create network table if it doesn't exist
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS network (
			nid INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			content TEXT NOT NULL
		)
	`)
	if err != nil {
		log.Printf("Failed to create network table: %v", err)
		return err
	}
	log.Println("Database tables initialized successfully")
	return nil
}

func SaveNetwork(name, content string) error {
	_, err := db.Exec(`
		INSERT INTO network (name, content)
		VALUES (?, ?)
	`, name, content)
	if err != nil {
		log.Printf("Failed to save network [name: %s]: %v", name, err)
		return err
	}
	log.Printf("Successfully saved network [name: %s]", name)
	return nil
}

func QueryNetwork(name string) ([]string, error) {
	rows, err := db.Query("SELECT content FROM network WHERE name = ?", name)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []string
	for rows.Next() {
		var content string
		if err := rows.Scan(&content); err != nil {
			return nil, err
		}
		results = append(results, content)
	}

	return results, nil
}

func GetNames() ([]string, error) {
	rows, err := db.Query(`SELECT name FROM network`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		names = append(names, name)
	}
	return names, nil
}
