# Intelligent Search Implementation Guide

## Overview

The Intelligent Search feature uses AWS Bedrock LLM to refine user queries and understand intent before searching the vector database. This improves search accuracy, provides better recommendations, and helps users find relevant artifacts more effectively.

## Architecture

```
User Query
    ↓
LLM Query Refinement (Bedrock)
    ├─ Refines search query
    ├─ Identifies intent
    ├─ Extracts key context
    └─ Calculates confidence score
    ↓
Vector DB Search (Chroma)
    ├─ Searches with refined query
    └─ Groups results by artifact
    ↓
Result Aggregation & Ranking
    ├─ Calculates confidence scores
    ├─ Enriches with metadata
    └─ Returns with download paths
    ↓
Client Response
    └─ Refined query + Results + Context
```

## New Endpoints

### 1. POST `/api/ai/intelligent-search`

**Purpose**: Perform intelligent search with LLM-powered query refinement

**Request Body**:
```json
{
  "query": "string (required) - User's search query",
  "context": "string (optional) - Additional context (e.g., opportunity details)",
  "limit": "integer (optional, default: 10, max: 50) - Number of results",
  "artifact_type": "string (optional) - Filter by artifact type",
  "industry": "string (optional) - Filter by industry"
}
```

**Response**:
```json
{
  "user_query": "original user query",
  "refined_query": "improved search query",
  "intent": "search|recommendation|analysis|comparison|learning",
  "search_context": "summary of search context",
  "llm_confidence": 0.0-1.0,
  "extracted_context": {
    "key_terms": ["term1", "term2"],
    "industry": "detected industry",
    "artifact_types": ["type1", "type2"],
    "technologies": ["tech1", "tech2"],
    "alternative_searches": ["alt1", "alt2"]
  },
  "total_results": 5,
  "results": [
    {
      "id": 1,
      "artifact_id": "ART-ABC123",
      "name": "Artifact Name",
      "artifact_type": "Case Study",
      "category": "PowerPoint Presentation",
      "industry": "Healthcare",
      "description": "...",
      "confidence_score": 0.92,
      "max_similarity": 0.95,
      "min_similarity": 0.89,
      "chunk_count": 5,
      "pages": [1, 2, 3],
      "download_path": "/api/artifacts/1/download",
      "has_file": true,
      "owner": "John Doe",
      "excerpts": [
        {
          "text": "Relevant excerpt from the document...",
          "similarity_score": 0.95,
          "page": 1
        }
      ]
    }
  ]
}
```

### 2. GET `/api/ai/search-recommendations`

**Purpose**: Get recommendations for improving a search query

**Query Parameters**:
- `query` (required): The search query to analyze

**Response**:
```json
{
  "original_query": "user's original query",
  "refined_query": "improved query",
  "intent": "detected intent",
  "key_terms": ["important", "search", "terms"],
  "suggested_filters": {
    "industry": "Healthcare",
    "artifact_types": ["Case Study", "Presentation"],
    "technologies": ["AI", "Cloud"]
  },
  "alternative_searches": [
    "alternative query 1",
    "alternative query 2"
  ],
  "search_context": "1-2 sentence summary",
  "llm_confidence": 0.85
}
```

### 3. Enhanced POST `/api/ai/assistant-search`

**Changes**:
- Now uses the intelligent search service to refine queries
- Returns additional metadata including `refined_query`, `intent`, and `llm_confidence`
- Uses refined query for better vector DB search

## Usage Examples

### Example 1: Simple Search
```bash
curl -X POST http://localhost:8000/api/ai/intelligent-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "cloud migration case studies"
  }'
```

### Example 2: Search with Context
```bash
curl -X POST http://localhost:8000/api/ai/intelligent-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "modernization strategy",
    "context": "Financial Services industry, legacy monolithic application",
    "artifact_type": "Case Study",
    "industry": "Finance",
    "limit": 15
  }'
```

### Example 3: Get Search Recommendations
```bash
curl -X GET "http://localhost:8000/api/ai/search-recommendations?query=AI%20implementation%20strategies"
```

## Key Features

### 1. Query Refinement
- LLM analyzes user queries to identify unclear or ambiguous terms
- Expands queries with relevant synonyms and related terms
- Improves vector DB search accuracy

### 2. Intent Detection
- Automatically identifies search intent:
  - `search`: User is looking for specific information
  - `recommendation`: User wants suggestions
  - `analysis`: User wants detailed analysis
  - `comparison`: User wants to compare options
  - `learning`: User wants to learn about a topic

### 3. Context Extraction
- Automatically extracts:
  - Key search terms
  - Relevant industry
  - Artifact types
  - Technologies mentioned
  - Alternative search suggestions

### 4. Confidence Scoring
- **LLM Confidence**: How well the LLM understood the query (0-1)
- **Artifact Confidence Score**: Aggregate similarity score across all chunks (0-1)
- **Max/Min Similarity**: Range of similarity scores for chunks

### 5. Result Enrichment
- Returns download paths for direct access to artifacts
- Includes top 3 relevant excerpts per artifact
- Groups by artifact (not chunks) for better UX
- Ranks by confidence score

## Implementation Details

### IntelligentSearchService

The `IntelligentSearchService` class provides:

1. **`refine_and_understand_query()`**
   - Takes user query and optional context
   - Returns refined query, intent, extracted context, and confidence
   - Falls back gracefully if LLM unavailable

2. **`build_search_context()`**
   - Combines refined query analysis into a single search context string
   - Used for vector DB search

3. **`intelligent_search()`**
   - Orchestrates the entire flow:
     1. Refines query with LLM
     2. Builds search context
     3. Searches vector DB
     4. Groups results by artifact
     5. Applies filters
     6. Returns ranked results

4. **`get_search_recommendations()`**
   - Analyzes a query and returns recommendations
   - Useful for guiding users to better searches

### Vector DB Search
- Original query and refined query both searchable
- Results grouped by artifact ID
- Duplicate artifacts removed
- Sorted by confidence score (descending)

### Fallback Behavior
If Bedrock is unavailable:
- Returns original query with confidence 0.3
- Search still works with original query
- No errors thrown to user

## Integration with Existing Features

### 1. Assistant Search Enhancement
- `/api/ai/assistant-search` now uses refined queries
- Maintains backward compatibility
- Returns additional metadata about refinement

### 2. Artifact Download
- Intelligent search results include download paths
- Users can directly download artifacts
- Format: `/api/artifacts/{id}/download`

### 3. Role-Based Access
- Search respects existing authentication
- No additional permissions needed
- Works for authenticated and unauthenticated users

## Configuration

The intelligent search uses AWS Bedrock configuration from `config.py`:
```python
aws_region = "us-east-1"  # Configure your region
bedrock_model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
```

## Performance Considerations

1. **LLM Call**: ~1-2 seconds for query refinement
2. **Vector DB Search**: ~0.5-1 second
3. **Total Response Time**: ~2-3 seconds

### Optimization Tips
- Cache common refinements
- Use smaller result limits for faster responses
- Filter by industry/type early

## Error Handling

The service gracefully handles:
- LLM unavailability → Uses original query
- Vector DB errors → Returns empty results with error message
- Invalid queries → Returns 400 with descriptive error
- Database errors → Returns 500 with error details

## Future Enhancements

1. **Multi-step Refinement**: Ask clarifying questions to user
2. **Learning from Clicks**: Improve refinement based on user selections
3. **Cross-artifact Search**: Search across related artifacts
4. **Recommendation Explanations**: Explain why each artifact is recommended
5. **Search History**: Track and learn from search patterns
6. **Result Re-ranking**: Use cross-encoder model for final ranking
7. **Internet Search Integration**: Supplement with web search results
8. **Query Expansion**: Automatically expand queries with related terms

## Troubleshooting

### Refined Query Not Improving Results
- Check LLM confidence score
- Try being more specific in the original query
- Use the `/api/ai/search-recommendations` endpoint to see alternatives
- Add more context

### Missing Expected Artifacts
- Ensure artifacts are indexed in vector DB
- Check artifact metadata is set correctly
- Try alternative search terms
- Use search recommendations to find better queries

### Slow Response Times
- Check Bedrock service health
- Reduce result limit
- Use filters (industry, artifact_type)
- Check network connectivity

### No Results
- Try refining the query manually
- Use alternative search terms
- Add more context
- Check if artifacts are in database and indexed

## API Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (missing query, invalid filters) |
| 401 | Unauthorized (for authenticated endpoints) |
| 500 | Server error (LLM or database issue) |

## Example Use Cases

### Use Case 1: Sales Finding Relevant Case Studies
**Query**: "healthcare company digital transformation"
**Result**: Gets case studies from similar companies and solutions

### Use Case 2: Architect Recommending Best Practices
**Query**: "microservices migration best practices"
**Result**: Gets whitepapers, presentations, and technical documentation

### Use Case 3: Presales Finding Competitive Information
**Query**: "how does our solution compare to competitors"
**Result**: Gets comparison documents and positioning materials

### Use Case 4: Customer Finding Industry Solutions
**Query**: "fintech payment processing solutions"
**Result**: Gets industry-specific case studies and solution guides
