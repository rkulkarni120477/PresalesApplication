import chromadb
from pathlib import Path
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class VectorDBService:
    """Service for managing vector database operations"""

    def __init__(self):
        # Initialize Chroma client with persistent storage (new API)
        db_path = Path("chroma_data")
        db_path.mkdir(exist_ok=True)

        # Use the newer Chroma API
        self.client = chromadb.PersistentClient(path=str(db_path))
        self.collection_name = "presales_artifacts"
        self.collection = self._get_or_create_collection()

    def _get_or_create_collection(self):
        """Get or create the artifacts collection"""
        try:
            return self.client.get_collection(name=self.collection_name)
        except:
            return self.client.create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )

    def add_artifact(self, artifact_id: str, chunks: List[Dict], artifact_metadata: Dict):
        """
        Add artifact chunks to vector database

        Args:
            artifact_id: Unique artifact identifier
            chunks: List of text chunks with metadata
            artifact_metadata: Artifact metadata (name, type, etc.)
        """
        try:
            documents = []
            metadatas = []
            ids = []

            for i, chunk in enumerate(chunks):
                chunk_id = f"{artifact_id}_chunk_{i}"
                chunk_text = chunk.get("text", "")

                if not chunk_text.strip():
                    continue

                # Create metadata for this chunk
                metadata = {
                    "artifact_id": artifact_id,
                    "artifact_name": artifact_metadata.get("name", ""),
                    "artifact_type": artifact_metadata.get("artifact_type", ""),
                    "industry": artifact_metadata.get("industry", ""),
                    "chunk_index": i,
                    "page": chunk.get("page", 0),
                    "source": artifact_metadata.get("source_reference", ""),
                }

                documents.append(chunk_text)
                metadatas.append(metadata)
                ids.append(chunk_id)

            if documents:
                self.collection.add(
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids
                )
                logger.info(f"Added {len(documents)} chunks for artifact {artifact_id}")
                return len(documents)
            return 0

        except Exception as e:
            logger.error(f"Error adding artifact to vector DB: {e}")
            raise

    def search(self, query: str, n_results: int = 5, artifact_id: Optional[str] = None) -> List[Dict]:
        """
        Search for similar chunks in the vector database

        Args:
            query: Search query text
            n_results: Number of results to return
            artifact_id: Optional artifact ID to filter results

        Returns:
            List of similar documents with metadata
        """
        try:
            where_filter = None
            if artifact_id:
                where_filter = {"artifact_id": artifact_id}

            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where_filter,
                include=["documents", "metadatas", "distances"]
            )

            if not results or not results.get("documents"):
                return []

            # Format results
            documents = results["documents"][0]
            metadatas = results["metadatas"][0]
            distances = results["distances"][0]

            formatted_results = []
            for doc, metadata, distance in zip(documents, metadatas, distances):
                formatted_results.append({
                    "text": doc,
                    "metadata": metadata,
                    "similarity_score": 1 - distance,  # Convert distance to similarity
                })

            return formatted_results

        except Exception as e:
            logger.error(f"Error searching vector DB: {e}")
            return []

    def delete_artifact(self, artifact_id: str) -> bool:
        """Delete all chunks for an artifact"""
        try:
            # Query all chunks for this artifact
            results = self.collection.get(
                where={"artifact_id": artifact_id}
            )

            if results and results.get("ids"):
                self.collection.delete(ids=results["ids"])
                logger.info(f"Deleted {len(results['ids'])} chunks for artifact {artifact_id}")
                return True
            return False

        except Exception as e:
            logger.error(f"Error deleting artifact from vector DB: {e}")
            return False

    def get_artifact_stats(self, artifact_id: str) -> Dict:
        """Get statistics about an artifact in the vector DB"""
        try:
            results = self.collection.get(
                where={"artifact_id": artifact_id}
            )

            if not results:
                return {"chunks": 0, "artifact_id": artifact_id}

            return {
                "artifact_id": artifact_id,
                "chunks": len(results.get("ids", [])),
                "artifact_name": results.get("metadatas", [{}])[0].get("artifact_name", ""),
                "artifact_type": results.get("metadatas", [{}])[0].get("artifact_type", ""),
            }

        except Exception as e:
            logger.error(f"Error getting artifact stats: {e}")
            return {}

# Global instance
vector_db_service = VectorDBService()
