package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"server/models"
	"server/utils"
	"strings"
	"time"

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
			encrypted_name TEXT NOT NULL,
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
			encrypted_content TEXT NOT NULL,
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

func SaveNetwork(name string, uid string, userToken string) (int64, error) {
	// Encrypt network name using user's token
	encryptedName, err := utils.Encrypt(name, userToken)
	if err != nil {
		return 0, fmt.Errorf("failed to encrypt network name: %v", err)
	}

	result, err := db.Exec(`
		INSERT INTO network (encrypted_name, uid)
		VALUES (?, ?)
	`, encryptedName, uid)
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

func SaveContent(nid int, content string, userID string, userToken string) (int64, error) {
	// Encrypt content using user's token
	encryptedContent, err := utils.Encrypt(content, userToken)
	if err != nil {
		return 0, err
	}

	query := `INSERT INTO content (nid, encrypted_content, uid) VALUES (?, ?, ?)`
	result, err := db.Exec(query, nid, encryptedContent, userID)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

func QueryNetwork(nid int, uid string, userToken string, timezone string) ([]string, error) {
	rows, err := db.Query(`
		SELECT encrypted_content, created_at 
		FROM content 
		WHERE nid IN (SELECT nid FROM network WHERE nid = ? AND uid = ?)
		ORDER BY created_at DESC
	`, nid, uid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	loc, err := time.LoadLocation(timezone)
	if err != nil {
		log.Printf("Failed to load timezone %s, falling back to UTC: %v", timezone, err)
		loc = time.UTC
	}

	var results []string
	for rows.Next() {
		var encryptedContent string
		var createdAt string
		if err := rows.Scan(&encryptedContent, &createdAt); err != nil {
			return nil, err
		}

		// Parse the ISO 8601 time from the database
		utcTime, err := time.Parse(time.RFC3339, createdAt)
		if err != nil {
			log.Printf("Failed to parse time %s: %v", createdAt, err)
			continue
		}

		// Convert to user's timezone
		localTime := utcTime.In(loc)

		// Decrypt content using user's token
		content, err := utils.Decrypt(encryptedContent, userToken)
		if err != nil {
			continue // Skip if decryption fails
		}
		// Format the date in local time and combine with content
		results = append(results, fmt.Sprintf("[%s] %s", localTime.Format("January 2, 2006"), content))
	}

	return results, nil
}

func GetNetworks(uid string, userToken string) ([]models.Network, error) {
	rows, err := db.Query(`SELECT nid, encrypted_name FROM network WHERE uid = ?`, uid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var networks []models.Network
	for rows.Next() {
		var network models.Network
		var encryptedName string
		if err := rows.Scan(&network.NID, &encryptedName); err != nil {
			return nil, err
		}

		// Decrypt network name using user's token
		decryptedName, err := utils.Decrypt(encryptedName, userToken)
		if err != nil {
			log.Printf("Failed to decrypt network name: %v", err)
			continue // Skip this network if decryption fails
		}
		network.Name = decryptedName
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

func GetNetworkContents(nid string, uid string, userToken string) ([]models.Content, error) {
	rows, err := db.Query(`
		SELECT c.cid, c.encrypted_content, c.created_at 
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
		var encryptedContent string
		if err := rows.Scan(&content.CID, &encryptedContent, &content.CreatedAt); err != nil {
			return nil, err
		}

		// Decrypt the content using user's token
		decryptedContent, err := utils.Decrypt(encryptedContent, userToken)
		if err != nil {
			log.Printf("Failed to decrypt content: %v", err)
			continue // Skip this content if decryption fails
		}
		content.Content = decryptedContent

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

func UpdateNetworkName(nid string, newName string, uid string, userToken string) error {
	// Encrypt the new name using user's token
	encryptedName, err := utils.Encrypt(newName, userToken)
	if err != nil {
		return fmt.Errorf("failed to encrypt network name: %v", err)
	}

	result, err := db.Exec(`
		UPDATE network 
		SET encrypted_name = ? 
		WHERE nid = ? AND uid = ?
	`, encryptedName, nid, uid)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no network found with nid: %s", nid)
	}

	return nil
}

// GetContentsByIDs retrieves content for specific content IDs
func GetContentsByIDs(nid int, contentIDs []int64, uid string, userToken string) ([]string, error) {
	// Convert contentIDs to a string for the IN clause
	idStrings := make([]string, len(contentIDs))
	for i, id := range contentIDs {
		idStrings[i] = fmt.Sprintf("%d", id)
	}
	idList := strings.Join(idStrings, ",")

	query := fmt.Sprintf(`
		SELECT encrypted_content, created_at 
		FROM content 
		WHERE nid = ? AND uid = ? AND cid IN (%s)
		ORDER BY created_at DESC
	`, idList)

	rows, err := db.Query(query, nid, uid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []string
	for rows.Next() {
		var encryptedContent string
		var createdAt string
		if err := rows.Scan(&encryptedContent, &createdAt); err != nil {
			return nil, err
		}

		// Parse the ISO 8601 time from the database
		utcTime, err := time.Parse(time.RFC3339, createdAt)
		if err != nil {
			log.Printf("Failed to parse time %s: %v", createdAt, err)
			continue
		}

		// Decrypt content using user's token
		content, err := utils.Decrypt(encryptedContent, userToken)
		if err != nil {
			continue // Skip if decryption fails
		}

		// Format the date and combine with content
		results = append(results, fmt.Sprintf("[%s] %s", utcTime.Format("2006-01-02 15:04:05"), content))
	}

	return results, nil
}
