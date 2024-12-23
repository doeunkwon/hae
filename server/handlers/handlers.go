package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"server/database"
	"server/models"
	"server/services"
	"server/services/embedder"
	"server/services/milvus"
	"time"

	"github.com/labstack/echo/v4"
)

func SaveInformation(c echo.Context) error {
	userID := c.Get("uid").(string)
	userToken := c.Get("token").(string)

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

	// Get embedder instance
	embed, err := embedder.GetEmbedder()
	if err != nil {
		log.Printf("Failed to get embedder: %v", err)
		return c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Failed to initialize embedder",
		})
	}

	// Generate embedding for the content
	vector, err := embed.EmbedText(info.Content)
	if err != nil {
		log.Printf("Failed to generate embedding: %v", err)
		return c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Failed to generate embedding",
		})
	}

	if req.NID == 0 {
		// Save new network
		nid, err := database.SaveNetwork(info.Name, userID, userToken)
		if err != nil {
			log.Printf("Database save failed: %v", err)
			return c.JSON(http.StatusInternalServerError, models.Response{
				Message: "Failed to save information",
			})
		}

		// Save content for the new network
		cid, err := database.SaveContent(int(nid), info.Content, userID, userToken)
		if err != nil {
			log.Printf("Database content save failed: %v", err)
			return c.JSON(http.StatusInternalServerError, models.Response{
				Message: "Failed to save content",
			})
		}

		// Store vector in Milvus
		err = milvus.InsertVector(context.Background(), cid, vector)
		if err != nil {
			log.Printf("Failed to store vector in Milvus: %v", err)
			return c.JSON(http.StatusInternalServerError, models.Response{
				Message: "Failed to store vector",
			})
		}

		return c.JSON(http.StatusOK, models.Response{
			Message: "Information saved successfully",
		})
	} else {
		// Add new content to existing network
		cid, err := database.SaveContent(req.NID, info.Content, userID, userToken)
		if err != nil {
			log.Printf("Database content save failed: %v", err)
			return c.JSON(http.StatusInternalServerError, models.Response{
				Message: "Failed to save content",
			})
		}

		// Store vector in Milvus
		err = milvus.InsertVector(context.Background(), cid, vector)
		if err != nil {
			log.Printf("Failed to store vector in Milvus: %v", err)
			return c.JSON(http.StatusInternalServerError, models.Response{
				Message: "Failed to store vector",
			})
		}

		return c.JSON(http.StatusOK, models.Response{
			Message: "Information added successfully",
		})
	}
}

func QueryInformation(c echo.Context) error {
	userID := c.Get("uid").(string)
	userToken := c.Get("token").(string)
	timezone := c.Request().Header.Get("X-Timezone")
	if timezone == "" {
		timezone = "UTC" // Default to UTC if no timezone is provided
	}

	// Parse the timezone
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		log.Printf("Invalid timezone: %v, falling back to UTC", err)
		loc = time.UTC
	}

	// Get current time in the specified timezone
	now := time.Now().In(loc)
	formattedDate := now.Format("January 2, 2006")

	var req models.QueryRequest
	if err := c.Bind(&req); err != nil {
		log.Printf("Failed to bind query request: %v", err)
		return c.JSON(http.StatusBadRequest, models.Response{
			Message: "Invalid request format",
		})
	}

	var results []string
	if req.NID != 0 && req.Query != "" {
		// Get embedder instance
		embed, err := embedder.GetEmbedder()
		if err != nil {
			log.Printf("Failed to get embedder: %v", err)
			return c.JSON(http.StatusInternalServerError, models.Response{
				Message: "Failed to initialize embedder",
			})
		}

		// Generate embedding for the query
		queryVector, err := embed.EmbedText(req.Query)
		if err != nil {
			log.Printf("Failed to generate embedding: %v", err)
			return c.JSON(http.StatusInternalServerError, models.Response{
				Message: "Failed to generate embedding",
			})
		}

		// Search for similar vectors in Milvus
		contentIDs, distances, err := milvus.SearchSimilar(context.Background(), queryVector, 5) // Get top 5 similar results
		if err != nil {
			log.Printf("Failed to search vectors: %v", err)
			return c.JSON(http.StatusInternalServerError, models.Response{
				Message: "Failed to search similar content",
			})
		}

		// If we found similar content
		if len(contentIDs) > 0 {
			// Get the relevant content from the database
			contents, err := database.GetContentsByIDs(req.NID, contentIDs, userID, userToken)
			if err != nil {
				log.Printf("Failed to get contents: %v", err)
				return c.JSON(http.StatusInternalServerError, models.Response{
					Message: "Failed to get relevant content",
				})
			}

			// Filter out results with low similarity (high distance)
			const maxDistance float32 = 1.5 // Lower threshold for stricter matching
			for i, content := range contents {
				if i < len(distances) && distances[i] < maxDistance {
					similarity := 1.0 - (distances[i] / 2.0) // Convert distance to similarity score (0-1)
					results = append(results, fmt.Sprintf("%s [similarity: %.2f]", content, similarity))
				}
			}

			if len(results) == 0 {
				log.Printf("No memories met the similarity threshold (max distance: %.2f) for query: %s", maxDistance, req.Query)
			} else {
				log.Printf("Found %d relevant memories for query: %s", len(results), req.Query)
			}
		} else {
			log.Printf("No similar vectors found in Milvus for query: %s", req.Query)
		}
	}

	fmt.Println("Content: ", results)

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
		Date:    formattedDate,
	})
}

func GetNetworks(c echo.Context) error {
	userID := c.Get("uid").(string)
	userToken := c.Get("token").(string)

	networks, err := database.GetNetworks(userID, userToken)
	if err != nil {
		log.Printf("Error getting networks: %v", err)
		return c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Failed to get networks",
		})
	}
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
	userToken := c.Get("token").(string)

	nid := c.Param("nid")
	contents, err := database.GetNetworkContents(nid, userID, userToken)
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

func UpdateNetworkName(c echo.Context) error {
	userID := c.Get("uid").(string)
	userToken := c.Get("token").(string)
	nid := c.Param("nid")

	var req struct {
		Name string `json:"name"`
	}
	if err := c.Bind(&req); err != nil {
		log.Printf("Failed to bind update request: %v", err)
		return c.JSON(http.StatusBadRequest, models.Response{
			Message: "Invalid request format",
		})
	}

	err := database.UpdateNetworkName(nid, req.Name, userID, userToken)
	if err != nil {
		log.Printf("Failed to update network name %s: %v", nid, err)
		return c.JSON(http.StatusInternalServerError, models.Response{
			Message: "Failed to update network name",
		})
	}

	return c.JSON(http.StatusOK, models.Response{
		Message: "Network name updated successfully",
	})
}
