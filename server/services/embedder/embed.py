import sys
import json
from sentence_transformers import SentenceTransformer

# Initialize the model globally
model = SentenceTransformer('all-MiniLM-L6-v2')


def embed_text(text):
    # Generate embeddings
    embedding = model.encode(text)

    # Convert to list and return as JSON
    return json.dumps(embedding.tolist())


if __name__ == "__main__":
    # Read input from stdin
    text = sys.stdin.read().strip()

    try:
        # Generate and print embedding
        print(embed_text(text))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
