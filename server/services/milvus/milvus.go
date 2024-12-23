package milvus

import (
	"context"
	"fmt"
	"log"

	"github.com/milvus-io/milvus-sdk-go/v2/client"
	"github.com/milvus-io/milvus-sdk-go/v2/entity"
)

const (
	CollectionName = "content_vectors"
	DIM            = 384 // Dimension of the embedding vectors from all-MiniLM-L6-v2
)

var milvusClient client.Client

// InitMilvus initializes connection to Milvus server
func InitMilvus() error {
	ctx := context.Background()
	var err error

	// Connect to Milvus
	milvusClient, err = client.NewGrpcClient(ctx, "localhost:19530")
	if err != nil {
		return fmt.Errorf("failed to connect to Milvus: %v", err)
	}

	// Check if collection exists
	exists, err := milvusClient.HasCollection(ctx, CollectionName)
	if err != nil {
		return fmt.Errorf("failed to check collection existence: %v", err)
	}

	if !exists {
		// Create collection if it doesn't exist
		schema := &entity.Schema{
			CollectionName: CollectionName,
			Description:    "Content embeddings collection",
			Fields: []*entity.Field{
				{
					Name:       "id",
					DataType:   entity.FieldTypeInt64,
					PrimaryKey: true,
					AutoID:     true,
				},
				{
					Name:     "content_id",
					DataType: entity.FieldTypeInt64,
				},
				{
					Name:     "vector",
					DataType: entity.FieldTypeFloatVector,
					TypeParams: map[string]string{
						"dim": fmt.Sprintf("%d", DIM),
					},
				},
			},
		}

		err = milvusClient.CreateCollection(ctx, schema, 1)
		if err != nil {
			return fmt.Errorf("failed to create collection: %v", err)
		}

		// Create index on the vector field
		idx, err := entity.NewIndexIvfFlat(entity.L2, 1024)
		if err != nil {
			return fmt.Errorf("failed to create index: %v", err)
		}

		err = milvusClient.CreateIndex(ctx, CollectionName, "vector", idx, false)
		if err != nil {
			return fmt.Errorf("failed to create index: %v", err)
		}

		log.Printf("Created new Milvus collection: %s", CollectionName)
	} else {
		log.Printf("Using existing Milvus collection: %s", CollectionName)
	}

	// Load collection into memory
	err = milvusClient.LoadCollection(ctx, CollectionName, false)
	if err != nil {
		return fmt.Errorf("failed to load collection: %v", err)
	}

	return nil
}

// Close closes the Milvus client connection
func Close() error {
	if milvusClient != nil {
		return milvusClient.Close()
	}
	return nil
}

// InsertVector inserts a vector with its content ID into Milvus
func InsertVector(ctx context.Context, contentID int64, vector []float32) error {
	if len(vector) != DIM {
		return fmt.Errorf("invalid vector dimension: expected %d, got %d", DIM, len(vector))
	}

	contentIDColumn := entity.NewColumnInt64("content_id", []int64{contentID})
	vectorColumn := entity.NewColumnFloatVector("vector", DIM, [][]float32{vector})

	_, err := milvusClient.Insert(ctx, CollectionName, "", contentIDColumn, vectorColumn)
	if err != nil {
		return fmt.Errorf("failed to insert vector: %v", err)
	}

	return nil
}

// SearchSimilar searches for similar vectors in Milvus
func SearchSimilar(ctx context.Context, vector []float32, limit int) ([]int64, []float32, error) {
	sp, err := entity.NewIndexIvfFlatSearchParam(10)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create search parameters: %v", err)
	}

	searchResult, err := milvusClient.Search(ctx, CollectionName,
		[]string{}, // All partitions
		"",         // Expression
		[]string{"content_id"},
		[]entity.Vector{entity.FloatVector(vector)},
		"vector",
		entity.L2,
		limit,
		sp,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to search vectors: %v", err)
	}

	contentIDs := make([]int64, 0, limit)
	distances := make([]float32, 0, limit)

	for _, result := range searchResult {
		for i := 0; i < result.ResultCount; i++ {
			contentID := result.Fields.GetColumn("content_id").(*entity.ColumnInt64).Data()[i]
			distance := result.Scores[i]
			contentIDs = append(contentIDs, contentID)
			distances = append(distances, distance)
		}
	}

	return contentIDs, distances, nil
}
