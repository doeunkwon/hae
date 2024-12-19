package database

import (
	"database/sql"
	"fmt"
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

	// Create network table if it doesn't exist
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS network (
			nid INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			uid TEXT NOT NULL
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
			uid TEXT NOT NULL,
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

func SaveNetwork(name string, uid string) (int64, error) {
	result, err := db.Exec(`
		INSERT INTO network (name, uid)
		VALUES (?, ?)
	`, name, uid)
	if err != nil {
		log.Printf("Failed to save network [name: %s]: %v", name, err)
		return 0, err
	}

	nid, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	return nid, nil
}

func SaveContent(nid int, content string, userID string) error {
	query := `INSERT INTO content (nid, content, uid) VALUES (?, ?, ?)`
	_, err := db.Exec(query, nid, content, userID)
	if err != nil {
		log.Printf("Failed to save content for network [nid: %d]: %v", nid, err)
		return err
	}
	return nil
}

func QueryNetwork(nid int, uid string) ([]string, error) {
	rows, err := db.Query(`
		SELECT content 
		FROM content 
		WHERE nid IN (SELECT nid FROM network WHERE nid = ? AND uid = ?)
		ORDER BY created_at DESC
	`, nid, uid)
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

func GetNetworks(uid string) ([]models.Network, error) {
	rows, err := db.Query(`SELECT nid, name FROM network WHERE uid = ?`, uid)
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

func DeleteNetwork(nid string, uid string) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}

	// Delete related content first (due to foreign key constraint)
	_, err = tx.Exec(`
		DELETE FROM content 
		WHERE nid IN (SELECT nid FROM network WHERE nid = ? AND uid = ?)
	`, nid, uid)
	if err != nil {
		tx.Rollback()
		return err
	}

	// Then delete the network
	_, err = tx.Exec(`DELETE FROM network WHERE nid = ? AND uid = ?`, nid, uid)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

func GetNetworkContents(nid string, uid string) ([]models.Content, error) {
	rows, err := db.Query(`
		SELECT c.cid, c.content, c.created_at 
		FROM content c
		JOIN network n ON c.nid = n.nid
		WHERE n.nid = ? AND n.uid = ?
		ORDER BY c.created_at DESC
	`, nid, uid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contents []models.Content
	for rows.Next() {
		var content models.Content
		if err := rows.Scan(&content.CID, &content.Content, &content.CreatedAt); err != nil {
			return nil, err
		}
		contents = append(contents, content)
	}
	return contents, nil
}

func DeleteContent(nid string, cid string, uid string) error {
	result, err := db.Exec(`
		DELETE FROM content 
		WHERE nid IN (SELECT nid FROM network WHERE nid = ? AND uid = ?)
		AND cid = ?
	`, nid, uid, cid)
	if err != nil {
		log.Printf("Error deleting content: %v", err)
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
		return err
	}

	if rowsAffected == 0 {
		log.Printf("No rows were deleted for nid: %s, cid: %s", nid, cid)
		return fmt.Errorf("no content found with nid: %s and cid: %s", nid, cid)
	}

	return nil
}
