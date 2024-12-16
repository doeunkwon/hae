package services

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

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

	text := response.Candidates[0].Content.Parts[0].(genai.Text)

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

func AnswerQuestion(name, question string, messages []models.Message, contentArray []string) (string, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
	if err != nil {
		return "", fmt.Errorf("failed to create client: %v", err)
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-1.5-flash")
	model.SetTemperature(1.0)
	// Combine the content array into a single string
	content := ""
	for _, c := range contentArray {
		content += c + "\n"
	}

	systemPrompt := fmt.Sprintf(`
		You are a knowledgeable assistant helping me recall information about %s. These are my personal memories and interactions with %s.

		Today's date is: %s

		My memories about %s:
		%s

		Question:
		%s

		Instructions:
		- Understand that all content represents my (the user's) direct experiences and interactions with %s
		- For example, if a memory says "Had coffee and discussed AI", it means I personally had coffee with %s
		- If memories are provided, base your answer strictly on these personal interactions
		- If no memories are provided or memories are empty, you may:
			a) For general knowledge questions (unrelated to %s), answer directly without any reference to memories
			b) For questions about %s, acknowledge that I haven't shared any relevant memories
		- Never make up or assume interactions that aren't explicitly mentioned in my memories
		- Be transparent about what you can and cannot determine from my shared experiences
		- Provide direct answers without:
			- Explaining why you know something
			- Mentioning what information was or wasn't provided
			- Prefacing your answer with phrases like "Based on the content..." or "I can tell you that..."
			- Adding qualifiers unless absolutely necessary
	`, name, name, time.Now().Format("January 2, 2006"), name, content, question, name, name, name, name)

	cs := model.StartChat()
	cs.History = []*genai.Content{
		{
			Parts: []genai.Part{genai.Text(systemPrompt)},
			Role:  "user",
		},
	}

	for _, message := range messages {
		cs.History = append(cs.History, &genai.Content{
			Parts: []genai.Part{genai.Text(message.Content)},
			Role:  message.Role,
		})
	}

	response, err := cs.SendMessage(ctx, genai.Text(question))
	if err != nil {
		return "", fmt.Errorf("failed to generate content: %v", err)
	}

	if len(response.Candidates) > 0 {
		answer := response.Candidates[0].Content.Parts[0].(genai.Text)
		return string(answer), nil
	}

	return "", fmt.Errorf("no valid response generated")
}
