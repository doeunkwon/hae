package main

import (
	"log"
	"server/database"
	"server/handlers"
	"server/middle"
	"server/services"
	"server/services/milvus"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: Error loading .env file: %v", err)
	}

	// Initialize database
	err := database.InitDB()
	if err != nil {
		log.Fatalf("Error initializing database: %v", err)
	}

	// Initialize Firebase
	err = services.InitFirebase()
	if err != nil {
		log.Fatalf("Error initializing Firebase: %v", err)
	}

	// Initialize Milvus
	err = milvus.InitMilvus()
	if err != nil {
		log.Fatalf("Error initializing Milvus: %v", err)
	}
	defer milvus.Close()

	// Create Echo instance
	e := echo.New()

	// Middleware
	// e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Routes with authentication
	e.POST("/save", handlers.SaveInformation, middle.FirebaseAuth)
	e.POST("/query", handlers.QueryInformation, middle.FirebaseAuth)
	e.GET("/networks", handlers.GetNetworks, middle.FirebaseAuth)
	e.DELETE("/networks/:nid/contents/:cid", handlers.DeleteContent, middle.FirebaseAuth)
	e.GET("/networks/:nid/contents", handlers.GetNetworkContents, middle.FirebaseAuth)
	e.DELETE("/networks/:nid", handlers.DeleteNetwork, middle.FirebaseAuth)
	e.PUT("/networks/:nid/name", handlers.UpdateNetworkName, middle.FirebaseAuth)

	// Start server
	e.Logger.Fatal(e.Start(":8080"))
}
