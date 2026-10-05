import json
import logging
import re
from typing import Optional, List, Dict
from config import settings
from services.bedrock_service import bedrock_service
from services.vector_db_service import vector_db_service

logger = logging.getLogger(__name__)


class IntelligentSearchService:
    """Service for LLM-powered intelligent search with query refinement"""

    def __init__(self):
        self.bedrock_service = bedrock_service
        self.vector_db_service = vector_db_service

    def refine_and_understand_query(self, user_query: str, context: Optional[str] = None) -> Dict:
        """
        Use LLM to refine user query and understand intent/context

        Args:
            user_query: Original user query
            context: Optional context (e.g., opportunity details, industry, etc.)

        Returns:
            Dict with refined_query, intent, extracted_context, confidence
        """
        if not self.bedrock_service.available:
            logger.warning("Bedrock service unavailable, returning original query")
            return {
                "refined_query": user_query,
                "intent": "search",
                "extracted_context": {},
                "confidence": 0.5,
                "error": "LLM service unavailable"
            }

        prompt = f"""
        Analyze this search query and help refine it for better artifact retrieval.

        USER QUERY: {user_query}
        {f'CONTEXT: {context}' if context else ''}

        Please provide your analysis in JSON format with the following fields:
        {{
            "refined_query": "An improved/expanded search query that captures the user's intent better",
            "intent": "The primary intent: search, recommendation, analysis, comparison, or learning",
            "key_terms": ["List", "of", "important", "search", "terms"],
            "industry": "Detected industry if any (e.g., healthcare, finance, retail, etc.)",
            "artifact_types": ["Relevant artifact types like case study, presentation, whitepaper, etc."],
            "technologies": ["Technologies or solutions involved if mentioned"],
            "confidence": 0.0 to 1.0 score on how well the query was understood,
            "search_context": "A 1-2 sentence summary of what artifacts would be most relevant",
            "alternative_searches": ["Alternative query 1", "Alternative query 2"]
        }}

        Respond ONLY with valid JSON, no additional text.
        """

        try:
            response = self.bedrock_service._invoke_model(prompt)
            if response:
                # Extract JSON from response
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group())
                    logger.info(f"Query refined. Intent: {parsed.get('intent')}, Confidence: {parsed.get('confidence')}")
                    return parsed
        except Exception as e:
            logger.error(f"Error refining query with LLM: {e}")

        # Fallback to simple analysis if LLM fails
        return {
            "refined_query": user_query,
            "intent": "search",
            "key_terms": user_query.split(),
            "confidence": 0.3,
            "search_context": f"Searching for: {user_query}",
            "error": "LLM processing failed, using fallback"
        }

    def build_search_context(self, refined_data: Dict) -> str:
        """
        Build comprehensive search context from refined query analysis

        Args:
            refined_data: Output from refine_and_understand_query

        Returns:
            Combined search context string
        """
        parts = []

        # Add refined query
        if refined_data.get("refined_query"):
            parts.append(refined_data["refined_query"])

        # Add key terms
        if refined_data.get("key_terms"):
            parts.append(" ".join(refined_data["key_terms"]))

        # Add industry context
        if refined_data.get("industry"):
            parts.append(f"industry:{refined_data['industry']}")

        # Add technology context
        if refined_data.get("technologies"):
            parts.append(" ".join(refined_data["technologies"]))

        return " ".join(parts)

    def intelligent_search(
        self,
        user_query: str,
        context: Optional[str] = None,
        n_results: int = 10,
        artifact_type: Optional[str] = None,
        industry: Optional[str] = None
    ) -> Dict:
        """
        Perform intelligent search: refine query -> search vector DB -> return results with context

        Args:
            user_query: Original user query
            context: Optional context
            n_results: Number of results to return
            artifact_type: Optional filter by artifact type
            industry: Optional filter by industry

        Returns:
            Dict with refined query, search context, results with confidence scores
        """
        # Step 1: Refine and understand the query
        refined_data = self.refine_and_understand_query(user_query, context)

        # Step 2: Build search context
        search_context = self.build_search_context(refined_data)

        # Step 3: Search vector DB with refined query
        refined_query = refined_data.get("refined_query", user_query)
        try:
            vector_results = self.vector_db_service.search(
                query=refined_query,
                n_results=n_results
            )
        except Exception as e:
            logger.error(f"Vector DB search failed: {e}")
            vector_results = []

        # Step 4: Group results by artifact and calculate relevance
        artifact_groups = self._group_results_by_artifact(vector_results)

        # Step 5: Apply additional filters if specified
        if artifact_type:
            artifact_groups = {
                k: v for k, v in artifact_groups.items()
                if v.get("artifact_type") == artifact_type
            }

        if industry:
            artifact_groups = {
                k: v for k, v in artifact_groups.items()
                if v.get("industry") == industry
            }

        # Sort by confidence score
        ranked_results = sorted(
            artifact_groups.values(),
            key=lambda x: x.get("confidence_score", 0),
            reverse=True
        )

        return {
            "user_query": user_query,
            "refined_query": refined_query,
            "intent": refined_data.get("intent"),
            "search_context": search_context,
            "llm_confidence": refined_data.get("confidence", 0),
            "extracted_context": refined_data,
            "total_results": len(ranked_results),
            "results": ranked_results
        }

    def _group_results_by_artifact(self, vector_results: List[Dict]) -> Dict:
        """
        Group vector search results by artifact and calculate aggregate confidence

        Args:
            vector_results: Results from vector DB search

        Returns:
            Dict mapping artifact_id to aggregated result data
        """
        artifact_groups = {}

        for result in vector_results:
            metadata = result.get("metadata", {})
            artifact_id = metadata.get("artifact_id")

            if not artifact_id:
                continue

            similarity_score = result.get("similarity_score", 0)

            if artifact_id not in artifact_groups:
                artifact_groups[artifact_id] = {
                    "artifact_id": artifact_id,
                    "artifact_name": metadata.get("artifact_name", "Unknown"),
                    "artifact_type": metadata.get("artifact_type", ""),
                    "industry": metadata.get("industry", ""),
                    "source": metadata.get("source", ""),
                    "chunk_count": 0,
                    "similarity_scores": [],
                    "excerpts": [],
                    "pages": set()
                }

            group = artifact_groups[artifact_id]
            group["chunk_count"] += 1
            group["similarity_scores"].append(similarity_score)
            group["pages"].add(metadata.get("page", 0))

            # Store top 3 excerpts
            if len(group["excerpts"]) < 3:
                group["excerpts"].append({
                    "text": result.get("text", "")[:500],
                    "similarity_score": round(similarity_score, 3),
                    "page": metadata.get("page")
                })

        # Calculate aggregate scores and convert pages to list
        for artifact_id, group in artifact_groups.items():
            if group["similarity_scores"]:
                group["confidence_score"] = round(sum(group["similarity_scores"]) / len(group["similarity_scores"]), 3)
                group["max_similarity"] = round(max(group["similarity_scores"]), 3)
                group["min_similarity"] = round(min(group["similarity_scores"]), 3)
            else:
                group["confidence_score"] = 0.0
                group["max_similarity"] = 0.0
                group["min_similarity"] = 0.0

            group["pages"] = sorted(list(group["pages"]))
            del group["similarity_scores"]  # Remove raw scores for cleaner output

        return artifact_groups

    def get_matched_keywords(self, artifact: Dict, key_terms: List[str]) -> List[str]:
        """
        Identify which keywords matched in an artifact

        Args:
            artifact: Artifact data
            key_terms: List of key terms from LLM

        Returns:
            List of matched keywords
        """
        matched = []
        text_to_search = f"{artifact.get('name', '')} {artifact.get('artifact_type', '')} {artifact.get('industry', '')}".lower()

        for term in key_terms:
            if term.lower() in text_to_search:
                matched.append(term)

        return matched

    def explain_artifact_relevance(self, artifact: Dict, search_context: str, matched_keywords: List[str]) -> str:
        """
        Generate explanation of how artifact addresses search context using LLM

        Args:
            artifact: Artifact data
            search_context: The search context from LLM
            matched_keywords: Keywords that matched

        Returns:
            Explanation string
        """
        if not self.bedrock_service.available:
            return f"Matches {len(matched_keywords)} key terms: {', '.join(matched_keywords)}"

        prompt = f"""
        Briefly explain (2-3 sentences) how this artifact is relevant to the search context.

        SEARCH CONTEXT: {search_context}
        MATCHED KEYWORDS: {', '.join(matched_keywords) if matched_keywords else 'N/A'}

        ARTIFACT:
        Name: {artifact.get('name')}
        Type: {artifact.get('artifact_type')}
        Industry: {artifact.get('industry')}
        Description: {artifact.get('description', 'No description')}

        Provide a clear explanation of how this artifact addresses the search context.
        Keep response concise (2-3 sentences).
        """

        try:
            response = self.bedrock_service._invoke_model(prompt)
            if response:
                return response.strip()
        except Exception as e:
            logger.warning(f"Error generating explanation: {e}")

        return f"Covers: {', '.join(matched_keywords) if matched_keywords else 'related content'}"

    def group_results_by_artifact_type(self, artifacts: List[Dict], type_order: List[str]) -> Dict[str, List[Dict]]:
        """
        Group artifacts by type in specified order

        Args:
            artifacts: List of artifacts
            type_order: Desired order of types (e.g., ['PowerPoint', 'Case Study', ...])

        Returns:
            Dict with types as keys and artifact lists as values
        """
        grouped = {}

        # Initialize groups in order
        for type_name in type_order:
            grouped[type_name] = []

        grouped["Other"] = []

        # Assign artifacts to groups
        for artifact in artifacts:
            artifact_type = artifact.get("category", "Other")
            if artifact_type in grouped:
                grouped[artifact_type].append(artifact)
            else:
                grouped["Other"].append(artifact)

        # Remove empty groups
        return {k: v for k, v in grouped.items() if v}

    def get_search_recommendations(self, user_query: str) -> Dict:
        """
        Get recommendations for improving search based on query analysis

        Args:
            user_query: User's search query

        Returns:
            Dict with recommendations and alternative searches
        """
        refined_data = self.refine_and_understand_query(user_query)

        return {
            "original_query": user_query,
            "refined_query": refined_data.get("refined_query"),
            "intent": refined_data.get("intent"),
            "key_terms": refined_data.get("key_terms", []),
            "suggested_filters": {
                "industry": refined_data.get("industry"),
                "artifact_types": refined_data.get("artifact_types", []),
                "technologies": refined_data.get("technologies", [])
            },
            "alternative_searches": refined_data.get("alternative_searches", []),
            "search_context": refined_data.get("search_context"),
            "llm_confidence": refined_data.get("confidence", 0)
        }


# Global instance
intelligent_search_service = IntelligentSearchService()
