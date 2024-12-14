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
		// Save new network
		nid, err := database.SaveNetwork(info.Name)
		if err != nil {
			log.Printf("Database save failed: %v", err)
			return c.JSON(http.StatusInternalServerError, models.Response{
				Message: "Failed to save information",
			})
		}

		// Save content for the new network
		err = database.SaveContent(int(nid), info.Content)
		if err != nil {
			log.Printf("Database content save failed: %v", err)
			return c.JSON(http.StatusInternalServerError, models.Response{
				Message: "Failed to save content",
			})
		}

		log.Println("Successfully saved information to database")
		return c.JSON(http.StatusOK, models.Response{
			Message: "Information saved successfully",
		})
	} else {
		// Add new content to existing network
		err = database.SaveContent(req.NID, info.Content)
		if err != nil {
			log.Printf("Database content save failed: %v", err)
			return c.JSON(http.StatusInternalServerError, models.Response{
				Message: "Failed to save content",
			})
		}

		log.Println("Successfully added content to network")
		return c.JSON(http.StatusOK, models.Response{
			Message: "Information added successfully",
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

	var results []string
	var err error
	if req.NID != 0 {

		// Query database with name
		results, err = database.QueryNetwork(req.NID)
		if err != nil {
			log.Printf("Database query failed: %v", err)
			return c.JSON(http.StatusInternalServerError, models.Response{
				Message: "Failed to query database",
			})
		}

		log.Printf("Query successful, found %d results", len(results))

		log.Printf("Results: %v", results)

	}

	answer, err := services.AnswerQuestion(req.Name, req.Query, req.Messages, results)
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

func DeleteNetwork(c echo.Context) error {
	nid := c.Param("nid")
	err := database.DeleteNetwork(nid)
	if err != nil {
		log.Printf("Failed to delete network %s: %v", nid, err)
		return c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Failed to delete network",
		})
	}
	return c.JSON(http.StatusOK, models.Response{
		Message: "Network deleted successfully",
	})
}

func GetNetworkContents(c echo.Context) error {
	nid := c.Param("nid")
	contents, err := database.GetNetworkContents(nid)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to fetch network contents",
		})
	}
	return c.JSON(http.StatusOK, contents)
}

func DeleteContent(c echo.Context) error {
	cid := c.Param("cid")

	log.Printf("Delete content request received [cid: %s]", cid)

	err := database.DeleteContent(cid)
	if err != nil {
		log.Printf("Failed to delete content %s: %v", cid, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to delete content",
		})
	}

	log.Printf("Content successfully deleted [cid: %s]", cid)
	return c.JSON(http.StatusOK, map[string]string{
		"message": "Content deleted successfully",
	})
}
