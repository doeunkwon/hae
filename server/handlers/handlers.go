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
	userID := c.Get("uid").(string)

	var req models.SaveRequest
	if err := c.Bind(&req); err != nil {
		log.Printf("Failed to bind save request: %v", err)
		return c.JSON(http.StatusBadRequest, models.Response{
			Message: "Invalid request format",
		})
	}

	// Extract information using Gemini
	info, err := services.ExtractInformation(req.Text)
	if err != nil {
		log.Printf("Gemini extraction failed: %v", err)
		return c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Failed to extract information",
		})
	}

	if req.NID == 0 {
		// Save new network
		nid, err := database.SaveNetwork(info.Name, userID)
		if err != nil {
			log.Printf("Database save failed: %v", err)
			return c.JSON(http.StatusInternalServerError, models.Response{
				Message: "Failed to save information",
			})
		}

		// Save content for the new network
		err = database.SaveContent(int(nid), info.Content, userID)
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
		err = database.SaveContent(req.NID, info.Content, userID)
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
	userID := c.Get("uid").(string)

	var req models.QueryRequest
	if err := c.Bind(&req); err != nil {
		log.Printf("Failed to bind query request: %v", err)
		return c.JSON(http.StatusBadRequest, models.Response{
			Message: "Invalid request format",
		})
	}

	var results []string
	var err error
	if req.NID != 0 {

		// Query database with name
		results, err = database.QueryNetwork(req.NID, userID)
		if err != nil {
			log.Printf("Database query failed: %v", err)
			return c.JSON(http.StatusInternalServerError, models.Response{
				Message: "Failed to query database",
			})
		}

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
	log.Printf("GetNetworks called with uid: %v", c.Get("uid"))
	userID := c.Get("uid").(string)
	networks, err := database.GetNetworks(userID)
	if err != nil {
		log.Printf("Error getting networks: %v", err)
		return c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Failed to get networks",
		})
	}
	log.Printf("Successfully retrieved %d networks", len(networks))
	return c.JSON(http.StatusOK, networks)
}

func DeleteNetwork(c echo.Context) error {
	userID := c.Get("uid").(string)
	nid := c.Param("nid")
	err := database.DeleteNetwork(nid, userID)
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
	userID := c.Get("uid").(string)
	nid := c.Param("nid")
	contents, err := database.GetNetworkContents(nid, userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to fetch network contents",
		})
	}
	return c.JSON(http.StatusOK, contents)
}

func DeleteContent(c echo.Context) error {
	userID := c.Get("uid").(string)
	cid := c.Param("cid")
	nid := c.Param("nid")

	err := database.DeleteContent(nid, cid, userID)
	if err != nil {
		log.Printf("Failed to delete content %s: %v", cid, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to delete content",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Content deleted successfully",
	})
}
