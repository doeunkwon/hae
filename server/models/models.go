package models

type Network struct {
	NID     int    `json:"nid"`
	Name    string `json:"name"`
	Content string `json:"content"`
}

type SaveRequest struct {
	NID  int    `json:"nid"`
	Text string `json:"text"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type QueryRequest struct {
	Query    string    `json:"query"`
	Name     string    `json:"name"`
	NID      int       `json:"nid"`
	Messages []Message `json:"messages"`
}

type Response struct {
	Message string `json:"message"`
	Answer  string `json:"answer"`
}

type ExtractedInfo struct {
	Content string `json:"content"`
	Name    string `json:"name"`
}

type Content struct {
	CID       int    `json:"cid"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}
