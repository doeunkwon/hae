package database

import (
	"database/sql"
	"log"
	"os"
	"server/models"

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
			name TEXT NOT NULL
		)
	`)
	if err != nil {
		log.Printf("Failed to create network table: %v", err)
		return err
	}

	// Create content table if it doesn't exist
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS content (
			cid INTEGER PRIMARY KEY AUTOINCREMENT,
			nid INTEGER NOT NULL,
			content TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (nid) REFERENCES network(nid)
		)
	`)
	if err != nil {
		log.Printf("Failed to create content table: %v", err)
		return err
	}

	log.Println("Database tables initialized successfully")
	return nil
}

func SaveNetwork(name string) (int64, error) {
	result, err := db.Exec(`
		INSERT INTO network (name)
		VALUES (?)
	`, name)
	if err != nil {
		log.Printf("Failed to save network [name: %s]: %v", name, err)
		return 0, err
	}

	nid, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	log.Printf("Successfully saved network [name: %s, nid: %d]", name, nid)
	return nid, nil
}

func SaveContent(nid int, content string) error {
	_, err := db.Exec(`
		INSERT INTO content (nid, content)
		VALUES (?, ?)
	`, nid, content)
	if err != nil {
		log.Printf("Failed to save content for network [nid: %d]: %v", nid, err)
		return err
	}
	log.Printf("Successfully saved content for network [nid: %d]", nid)
	return nil
}

func QueryNetwork(nid int) ([]string, error) {
	rows, err := db.Query(`
		SELECT content 
		FROM content 
		WHERE nid = ? 
		ORDER BY created_at DESC
	`, nid)
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

func GetNetworks() ([]models.Network, error) {
	rows, err := db.Query(`SELECT nid, name FROM network`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var networks []models.Network
	for rows.Next() {
		var network models.Network
		if err := rows.Scan(&network.NID, &network.Name); err != nil {
			return nil, err
		}
		networks = append(networks, network)
	}
	return networks, nil
}
