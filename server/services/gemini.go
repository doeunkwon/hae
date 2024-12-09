package services

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"server/models"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

func ExtractInformation(input string) (*models.ExtractedInfo, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
	if err != nil {
		return nil, fmt.Errorf("failed to create client: %v", err)
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-1.5-flash")
	model.SetTemperature(0)
	model.ResponseMIMEType = "application/json"
	model.ResponseSchema = &genai.Schema{
		Type: genai.TypeObject,
		Properties: map[string]*genai.Schema{
			"content": {Type: genai.TypeString},
			"name":    {Type: genai.TypeString},
		},
	}

	prompt := fmt.Sprintf(`
		You are a personal CRM assistant. From the following interaction, identify the main person and what happened.
		
		Interaction: %s

		Respond ONLY with a JSON object in this format:
		{ "content": "A concise summary focusing on what happened with this person","name": "The person's full name" }

		Example input:
		"Had coffee with Alex Zhang this morning. We discussed his recent promotion at Google and his plans to move to the AI team. His wife Sarah was there too and mentioned their upcoming trip to Japan."

		Example output:
		{ "content": "Met for coffee. Discussed his promotion at Google and planned move to the AI team. Mentioned upcoming Japan trip.", "name": "Alex Zhang" }

		Rules:
		- If multiple people are mentioned, focus on the most significant person
		- Extract the most complete version of their name
		- The content should be a brief, clear summary (aim for 1-2 lines)
		- Include key facts but omit unnecessary details
		- Return ONLY the JSON, no other text
	`, input)

	response, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, fmt.Errorf("failed to generate content: %v", err)
	}

	fmt.Printf("Raw response: %+v\n", response)
	if len(response.Candidates) > 0 {
		fmt.Printf("First candidate: %+v\n", response.Candidates[0])
	}

	text := response.Candidates[0].Content.Parts[0].(genai.Text)
	fmt.Printf("Extracted text: %s\n", text)

	var result models.ExtractedInfo
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		fmt.Printf("failed to parse response JSON: %v\nraw text: %s", err, text)
		return nil, fmt.Errorf("failed to parse response JSON: %v\nraw text: %s", err, text)
	}

	if result.Name == "" || result.Content == "" {
		fmt.Printf("invalid response: missing required fields\nraw text: %s", text)
		return nil, fmt.Errorf("invalid response: missing required fields\nraw text: %s", text)
	}

	return &result, nil
}

func EnhanceQuery(query string) (string, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
	if err != nil {
		return "", fmt.Errorf("failed to create client: %v", err)
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-1.5-flash")
	prompt := fmt.Sprintf(`
		Enhance the following search query to make it more effective for database search:
		Query: %s

		Return only the enhanced query text without any additional explanation.
	`, query)

	response, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", fmt.Errorf("failed to generate content: %v", err)
	}

	return string(response.Candidates[0].Content.Parts[0].(genai.Text)), nil /// !!! Might not work
}
