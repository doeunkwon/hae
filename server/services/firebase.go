package services

import (
	"context"
	"fmt"
	"log"
	"os"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

var FirebaseAuth *auth.Client

func InitFirebase() error {
	serviceAccountKey := os.Getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
	if serviceAccountKey == "" {
		return fmt.Errorf("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set")
	}

	log.Printf("Initializing Firebase with service account key length: %d", len(serviceAccountKey))
	opt := option.WithCredentialsJSON([]byte(os.Getenv("FIREBASE_SERVICE_ACCOUNT_KEY")))
	app, err := firebase.NewApp(context.Background(), nil, opt)
	if err != nil {
		log.Printf("Failed to initialize Firebase app: %v", err)
		return err
	}

	FirebaseAuth, err = app.Auth(context.Background())
	if err != nil {
		log.Printf("Failed to initialize Firebase Auth: %v", err)
		return err
	}

	log.Println("Firebase initialized successfully")
	return nil
}
