package embedder

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
)

var (
	instance *Embedder
	once     sync.Once
)

// Embedder represents the text embedding service
type Embedder struct {
	pythonPath string
	scriptPath string
	mutex      sync.Mutex
}

// GetEmbedder returns a singleton instance of Embedder
func GetEmbedder() (*Embedder, error) {
	var initErr error
	once.Do(func() {
		instance, initErr = NewEmbedder()
	})
	return instance, initErr
}

// newEmbedder creates a new instance of Embedder
func NewEmbedder() (*Embedder, error) {
	// Get the current working directory
	wd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("failed to get working directory: %v", err)
	}

	// Construct the path to the Python script
	scriptPath := filepath.Join(wd, "services", "embedder", "embed.py")

	// Check if the script exists
	if _, err := os.Stat(scriptPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("embedder script not found at %s", scriptPath)
	}

	// Find Python path (assuming python3 is in PATH)
	pythonPath, err := exec.LookPath("python3")
	if err != nil {
		return nil, fmt.Errorf("python3 not found in PATH: %v", err)
	}

	return &Embedder{
		pythonPath: pythonPath,
		scriptPath: scriptPath,
		mutex:      sync.Mutex{},
	}, nil
}

// EmbedText generates an embedding for the given text
func (e *Embedder) EmbedText(text string) ([]float32, error) {
	e.mutex.Lock()
	defer e.mutex.Unlock()

	// Create command
	cmd := exec.Command(e.pythonPath, e.scriptPath)

	// Create pipes for stdin and stdout
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdin pipe: %v", err)
	}

	// Start the command
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start command: %v", err)
	}

	// Write input text to stdin
	if _, err := stdin.Write([]byte(text)); err != nil {
		return nil, fmt.Errorf("failed to write to stdin: %v", err)
	}
	stdin.Close()

	// Wait for the command to complete
	if err := cmd.Wait(); err != nil {
		return nil, fmt.Errorf("command failed: %v\nstderr: %s", err, stderr.String())
	}

	// Parse the output
	var embedding []float32
	if err := json.Unmarshal(stdout.Bytes(), &embedding); err != nil {
		return nil, fmt.Errorf("failed to parse embedding: %v", err)
	}

	return embedding, nil
}
