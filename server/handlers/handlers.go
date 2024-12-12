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
	log.Printf("Processing text from network %d of length: %d characters", req.NID, len(req.Text))

	// Extract information using Gemini
	info, err := services.ExtractInformation(req.Text)
	if err != nil {
		log.Printf("Gemini extraction failed: %v", err)
		return c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Failed to extract information",
		})
	}
	log.Printf("Successfully extracted information - Name: %s", info.Name)

	if req.NID == 0 {
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
	} else {
		// Update existing network
		err = database.UpdateNetwork(req.NID, info.Content)
		if err != nil {
			log.Printf("Database update failed: %v", err)
			return c.JSON(http.StatusInternalServerError, models.Response{
				Message: "Failed to update information",
			})
		}

		log.Println("Successfully updated information in database")
		return c.JSON(http.StatusOK, models.Response{
			Message: "Information updated successfully",
		})
	}
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
	log.Printf("Processing query for name: %s, query: %s", req.Name, req.Query)

	// Query database with name
	results, err := database.QueryNetwork(req.NID)
	if err != nil {
		log.Printf("Database query failed: %v", err)
		return c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Failed to query database",
		})
	}

	log.Printf("Query successful, found %d results", len(results))

	log.Printf("Results: %v", results)

	answer, err := services.AnswerQuestion(req.Name, req.Query, results)
	if err != nil {
		log.Printf("Failed to answer question: %v", err)
		return c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Failed to answer question",
		})
	}

	return c.JSON(http.StatusOK, models.Response{
		Message: "Query successful",
		Answer:  answer,
	})
}

func GetNetworks(c echo.Context) error {
	networks, err := database.GetNetworks()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Failed to get networks",
		})
	}
	return c.JSON(http.StatusOK, networks)
}
