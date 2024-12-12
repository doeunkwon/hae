package models

type Network struct {
	NID     int    `json:"nid"`
	Name    string `json:"name"`
	Content string `json:"content"`
}

type SaveRequest struct {
	Text string `json:"text"`
}

type QueryRequest struct {
	Query string `json:"query"`
	Name  string `json:"name"`
	NID   int    `json:"nid"`
}

type Response struct {
	Message string `json:"message"`
	Answer  string `json:"answer"`
}

type ExtractedInfo struct {
	Content string `json:"content"`
	Name    string `json:"name"`
}
