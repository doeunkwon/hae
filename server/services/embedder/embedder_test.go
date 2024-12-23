package embedder_test

import (
	"server/services/embedder"
	"testing"
)

func TestEmbedder(t *testing.T) {
	// Create a new embedder
	embedder, err := embedder.NewEmbedder()
	if err != nil {
		t.Fatalf("Failed to create embedder: %v", err)
	}

	// Test cases
	testCases := []struct {
		name    string
		input   string
		wantDim int // Expected embedding dimension
		wantErr bool
	}{
		{
			name:    "Basic sentence",
			input:   "Hello world",
			wantDim: 384, // all-MiniLM-L6-v2 produces 384-dimensional embeddings
			wantErr: false,
		},
		{
			name:    "Empty string",
			input:   "",
			wantDim: 384,
			wantErr: false,
		},
		{
			name:    "Long text",
			input:   "This is a longer piece of text that contains multiple sentences. It should still work fine with the embedder. The model should be able to handle this without any issues.",
			wantDim: 384,
			wantErr: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Generate embedding
			embedding, err := embedder.EmbedText(tc.input)

			// Check error expectation
			if (err != nil) != tc.wantErr {
				t.Errorf("EmbedText() error = %v, wantErr %v", err, tc.wantErr)
				return
			}

			// If we don't expect an error, check the embedding
			if !tc.wantErr {
				// Check embedding dimension
				if len(embedding) != tc.wantDim {
					t.Errorf("Embedding dimension = %d, want %d", len(embedding), tc.wantDim)
				}

				// Check that embeddings are not all zeros
				allZeros := true
				for _, v := range embedding {
					if v != 0 {
						allZeros = false
						break
					}
				}
				if allZeros {
					t.Error("Embedding contains all zeros")
				}

				// Check that values are within a reasonable range
				for i, v := range embedding {
					if v < -100 || v > 100 {
						t.Errorf("Embedding value at position %d is outside reasonable range: %f", i, v)
					}
				}
			}
		})
	}
}
