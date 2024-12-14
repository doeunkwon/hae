package main

import (
	"log"
	"server/database"
	"server/handlers"

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

	// Create Echo instance
	e := echo.New()

	// Middleware
	// e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Routes
	e.POST("/save", handlers.SaveInformation)
	e.POST("/query", handlers.QueryInformation)
	e.GET("/networks", handlers.GetNetworks)
	e.DELETE("/networks/:nid/contents/:cid", handlers.DeleteContent)
	e.GET("/networks/:nid/contents", handlers.GetNetworkContents)
	e.DELETE("/networks/:nid", handlers.DeleteNetwork)

	// Start server
	e.Logger.Fatal(e.Start(":8080"))
}
