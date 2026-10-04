# Intelligent Search - Quick Start Guide

## What's New?
The Presales App now has AI-powered intelligent search that:
- ✅ Refines user queries using LLM (AWS Bedrock)
- ✅ Understands search intent automatically
- ✅ Extracts context (industry, technologies, artifact types)
- ✅ Finds relevant artifacts with confidence scoring
- ✅ Provides direct download paths

## 3-Minute Setup

### 1. Start the Server
```bash
cd backend
python main.py
```

### 2. Make Your First API Call
```bash
curl -X POST http://localhost:8000/api/ai/intelligent-search \
  -H "Content-Type: application/json" \
  -d '{"query": "cloud migration case studies"}'
```

### 3. Check the Response
You'll get:
- ✓ Refined query (improved for better search)
- ✓ Detected intent (search/recommendation/analysis/etc)
- ✓ LLM confidence score
- ✓ List of artifacts with confidence scores
- ✓ Download paths for each artifact

## Common Use Cases

### Case 1: Simple Search
```bash
curl -X POST http://localhost:8000/api/ai/intelligent-search \
  -H "Content-Type: application/json" \
  -d '{"query": "AI implementation strategies"}'
```

### Case 2: Search with Context
```bash
curl -X POST http://localhost:8000/api/ai/intelligent-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "modernization",
    "context": "Healthcare industry, legacy monolithic app"
  }'
```

### Case 3: Search with Filters
```bash
curl -X POST http://localhost:8000/api/ai/intelligent-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "digital transformation",
    "artifact_type": "Case Study",
    "industry": "Finance",
    "limit": 10
  }'
```

### Case 4: Get Search Recommendations
```bash
curl -X GET "http://localhost:8000/api/ai/search-recommendations?query=machine%20learning%20implementation"
```

## Response Structure

```json
{
  "user_query": "original query",
  "refined_query": "improved query",
  "intent": "search|recommendation|analysis|comparison|learning",
  "llm_confidence": 0.92,
  "total_results": 5,
  "results": [
    {
      "artifact_id": "ART-001",
      "name": "Artifact Name",
      "category": "Case Study",
      "confidence_score": 0.94,
      "download_path": "/api/artifacts/1/download",
      "excerpts": [
        {
          "text": "Relevant excerpt...",
          "similarity_score": 0.96
        }
      ]
    }
  ]
}
```

## Key Response Fields

| Field | Meaning |
|-------|---------|
| `refined_query` | LLM-improved version of your search |
| `intent` | What the user is trying to do (search, learn, compare, etc) |
| `llm_confidence` | How confident the LLM is (0-1 scale) |
| `confidence_score` | How relevant each artifact is (0-1 scale) |
| `download_path` | Direct link to download the artifact |
| `excerpts` | Relevant text snippets from the document |

## Testing

### Run Full Test Suite
```bash
python test_intelligent_search.py
```

### Quick Test in Python
```python
import requests

response = requests.post(
    "http://localhost:8000/api/ai/intelligent-search",
    json={"query": "cloud migration"}
)

results = response.json()
print(f"Found {results['total_results']} artifacts")
for artifact in results['results']:
    print(f"- {artifact['name']} (confidence: {artifact['confidence_score']})")
    print(f"  Download: {artifact['download_path']}")
```

## API Endpoints Reference

### 1. POST `/api/ai/intelligent-search`
**Purpose**: Smart search with query refinement

**Request**:
```json
{
  "query": "string (required)",
  "context": "string (optional)",
  "limit": "integer (optional, max 50)",
  "artifact_type": "string (optional)",
  "industry": "string (optional)"
}
```

**Response**: 
- 200: Success with results and metadata
- 400: Bad request (missing query)
- 500: Server error

---

### 2. GET `/api/ai/search-recommendations`
**Purpose**: Get tips to improve a search

**Query Params**:
- `query` (required): The search query to analyze

**Response**:
- `refined_query`: Better version of the query
- `intent`: What user is trying to do
- `alternative_searches`: Other ways to search
- `suggested_filters`: Industry, types, technologies

---

### 3. POST `/api/ai/assistant-search` (Enhanced)
**Purpose**: Original assistant search, now with query refinement

**Now includes**:
- `refined_query`: Query improved by LLM
- `intent`: Detected search intent
- `llm_confidence`: LLM confidence score

## Performance Tips

1. **Faster Searches**
   - Use `limit: 5` for quick results
   - Filter by `industry` or `artifact_type` early
   - Avoid very broad queries

2. **Better Results**
   - Add `context` when possible
   - Be specific in your query
   - Use `search-recommendations` to explore options

3. **Error Handling**
   - Check `llm_confidence` - low score means refine your query
   - If no results, try `search-recommendations`
   - Bedrock unavailable? Search still works with original query

## Frontend Integration Example

```javascript
// Search for artifacts
const searchArtifacts = async (query, context = null) => {
  const response = await fetch('/api/ai/intelligent-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, context, limit: 10 })
  });
  
  const data = await response.json();
  
  return {
    refinedQuery: data.refined_query,
    intent: data.intent,
    confidence: data.llm_confidence,
    artifacts: data.results.map(a => ({
      id: a.id,
      name: a.name,
      type: a.category,
      relevance: a.confidence_score,
      downloadUrl: a.download_path,
      excerpt: a.excerpts[0]?.text || ''
    }))
  };
};

// Get search tips
const getSearchTips = async (query) => {
  const response = await fetch(
    `/api/ai/search-recommendations?query=${encodeURIComponent(query)}`
  );
  return response.json();
};
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No results | Try using `search-recommendations` to refine query |
| Low confidence score | Query might be unclear - add more context |
| Slow responses | Reduce `limit`, add filters, be more specific |
| 500 errors | Check if Bedrock is configured (graceful fallback exists) |
| Empty artifacts | Ensure artifacts are indexed in vector DB |

## Need Help?

1. **Full Documentation**: See `INTELLIGENT_SEARCH_GUIDE.md`
2. **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`
3. **Test Examples**: See `test_intelligent_search.py`
4. **Server Logs**: Check for error messages

## Configuration

Everything is configured in `config.py`:
```python
aws_region = "ap-south-1"  # Your AWS region
bedrock_model_id = "anthropic.claude-3-sonnet-20240229-v1:0"  # Claude 3
```

No additional configuration needed - it just works!

## What Happens Behind the Scenes?

1. **LLM Refinement** (1-2s)
   - Query is sent to Bedrock (Claude 3)
   - LLM improves the query
   - Extracts intent and context

2. **Vector Search** (0.5-1s)
   - Refined query searches Chroma DB
   - Gets semantic matches
   - Computes similarity scores

3. **Aggregation** (0.1s)
   - Groups results by artifact
   - Calculates confidence scores
   - Formats response

**Total Time**: 2-3 seconds (typical)

## Examples of Query Refinement

| Original | Refined |
|----------|---------|
| "cloud" | "cloud computing migration case studies and best practices" |
| "AI" | "artificial intelligence implementation strategies and use cases" |
| "mobile" | "mobile application development and modernization strategies" |
| "security" | "cybersecurity best practices and risk management frameworks" |

## Next Steps

1. ✅ Try the example requests above
2. ✅ Run the test suite
3. ✅ Integrate into your frontend
4. ✅ Check the full guide for advanced features

---

**Ready to use intelligent search!** 🚀

For detailed documentation, see `INTELLIGENT_SEARCH_GUIDE.md`
