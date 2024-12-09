package handlers

import (
	"log"
	"net/http"
	"server/database"
	"server/models"
	"server/services"

	"github.com/labstack/echo/v4"
)

func SaveInformation(c echo.Context) error {
	log.Printf("Received save information request from %s", c.Request().RemoteAddr)

	var req models.SaveRequest
	if err := c.Bind(&req); err != nil {
		log.Printf("Failed to bind save request: %v", err)
		return c.JSON(http.StatusBadRequest, models.Response{
			Message: "Invalid request format",
		})
	}
	log.Printf("Processing text of length: %d characters", len(req.Text))

	// Extract information using Gemini
	info, err := services.ExtractInformation(req.Text)
	if err != nil {
		log.Printf("Gemini extraction failed: %v", err)
		return c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Failed to extract information",
		})
	}
	log.Printf("Successfully extracted information - Name: %s", info.Name)

	// Save to database
	err = database.SaveNetwork(info.Name, info.Content)
	if err != nil {
		log.Printf("Database save failed: %v", err)
		return c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Failed to save information",
		})
	}

	log.Println("Successfully saved information to database")
	return c.JSON(http.StatusOK, models.Response{
		Message: "Information saved successfully",
	})
}

func QueryInformation(c echo.Context) error {
	log.Printf("Received query request from %s", c.Request().RemoteAddr)

	var req models.QueryRequest
	if err := c.Bind(&req); err != nil {
		log.Printf("Failed to bind query request: %v", err)
		return c.JSON(http.StatusBadRequest, models.Response{
			Message: "Invalid request format",
		})
	}
	log.Printf("Processing query: %s", req.Query)

	// Enhance query using Gemini
	enhancedQuery, err := services.EnhanceQuery(req.Query)
	if err != nil {
		log.Printf("Query enhancement failed: %v", err)
		return c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Failed to enhance query",
		})
	}
	log.Printf("Enhanced query: %s", enhancedQuery)

	// Query database
	results, err := database.QueryNetwork(enhancedQuery)
	if err != nil {
		log.Printf("Database query failed: %v", err)
		return c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Failed to query database",
		})
	}

	log.Printf("Query successful, found %d results", len(results))
	return c.JSON(http.StatusOK, models.Response{
		Message: "Query successful",
		Data:    results,
	})
}
