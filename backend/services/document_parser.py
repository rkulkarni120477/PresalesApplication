import logging
from pathlib import Path
from typing import List, Dict
import re
from PyPDF2 import PdfReader
from docx import Document
import mimetypes

logger = logging.getLogger(__name__)

class DocumentParser:
    """Service for parsing documents and extracting text"""

    # Chunk size for tokenization (characters)
    CHUNK_SIZE = 1000
    CHUNK_OVERLAP = 200  # Overlap between chunks for context

    @staticmethod
    def parse_file(file_path: Path) -> str:
        """
        Parse a file and extract text content

        Args:
            file_path: Path to the file

        Returns:
            Extracted text content
        """
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        file_ext = file_path.suffix.lower()

        logger.info(f"Parsing file: {file_path} (type: {file_ext})")

        if file_ext == ".pdf":
            return DocumentParser._parse_pdf(file_path)
        elif file_ext in [".docx", ".doc"]:
            return DocumentParser._parse_docx(file_path)
        elif file_ext in [".txt", ".md"]:
            return DocumentParser._parse_text(file_path)
        elif file_ext == ".csv":
            return DocumentParser._parse_csv(file_path)
        else:
            # Try to parse as text
            logger.warning(f"Unknown file type: {file_ext}, attempting text parsing")
            return DocumentParser._parse_text(file_path)

    @staticmethod
    def _parse_pdf(file_path: Path) -> str:
        """Extract text from PDF file"""
        try:
            text = ""
            with open(file_path, "rb") as f:
                pdf_reader = PdfReader(f)
                total_pages = len(pdf_reader.pages)
                # For large PDFs (>500 pages), limit to first 500 pages to avoid timeout
                max_pages = min(total_pages, 500)

                logger.info(f"Parsing PDF with {total_pages} pages (extracting up to {max_pages})")

                for page_num in range(max_pages):
                    try:
                        page = pdf_reader.pages[page_num]
                        page_text = page.extract_text()
                        if page_text:
                            text += f"\n--- Page {page_num + 1} ---\n{page_text}"

                        # Log progress every 50 pages
                        if (page_num + 1) % 50 == 0:
                            logger.info(f"Progress: Extracted {page_num + 1}/{max_pages} pages ({len(text)} chars so far)")
                    except Exception as page_error:
                        logger.warning(f"Error parsing page {page_num + 1}: {page_error}, continuing...")
                        continue

                logger.info(f"Extracted {len(text)} characters from PDF ({max_pages}/{total_pages} pages)")
                return text
        except Exception as e:
            logger.error(f"Error parsing PDF: {e}")
            raise

    @staticmethod
    def _parse_docx(file_path: Path) -> str:
        """Extract text from DOCX file"""
        try:
            doc = Document(file_path)
            text = ""

            for para in doc.paragraphs:
                if para.text.strip():
                    text += para.text + "\n"

            # Extract text from tables
            for table in doc.tables:
                for row in table.rows:
                    row_text = []
                    for cell in row.cells:
                        row_text.append(cell.text)
                    text += " | ".join(row_text) + "\n"

            logger.info(f"Extracted {len(text)} characters from DOCX")
            return text
        except Exception as e:
            logger.error(f"Error parsing DOCX: {e}")
            raise

    @staticmethod
    def _parse_text(file_path: Path) -> str:
        """Extract text from plain text file"""
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()

            logger.info(f"Extracted {len(text)} characters from text file")
            return text
        except Exception as e:
            logger.error(f"Error parsing text file: {e}")
            raise

    @staticmethod
    def _parse_csv(file_path: Path) -> str:
        """Extract text from CSV file"""
        try:
            import csv
            text = ""
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                csv_reader = csv.reader(f)
                for row in csv_reader:
                    text += " | ".join(row) + "\n"

            logger.info(f"Extracted {len(text)} characters from CSV")
            return text
        except Exception as e:
            logger.error(f"Error parsing CSV: {e}")
            raise

    @staticmethod
    def tokenize_text(text: str, chunk_size: int = None, chunk_overlap: int = None) -> List[Dict]:
        """
        Tokenize text into chunks with overlap

        Args:
            text: Text to tokenize
            chunk_size: Size of each chunk (default: 1000)
            chunk_overlap: Overlap between chunks (default: 200)

        Returns:
            List of text chunks with metadata
        """
        if chunk_size is None:
            chunk_size = DocumentParser.CHUNK_SIZE
        if chunk_overlap is None:
            chunk_overlap = DocumentParser.CHUNK_OVERLAP

        # Clean text
        text = DocumentParser._clean_text(text)

        if len(text) == 0:
            return []

        chunks = []
        start = 0
        page = 0

        while start < len(text):
            # Find chunk end
            end = start + chunk_size

            # Try to break at sentence boundary
            if end < len(text):
                # Look for last period, newline, or space within reasonable distance
                search_end = min(end + 100, len(text))
                last_period = text.rfind(".", start, search_end)
                last_newline = text.rfind("\n", start, search_end)
                last_space = text.rfind(" ", start, search_end)

                candidates = [p for p in [last_period, last_newline, last_space] if p > start]
                if candidates:
                    end = max(candidates) + 1

            chunk_text = text[start:end].strip()

            if chunk_text:  # Only add non-empty chunks
                chunks.append({
                    "text": chunk_text,
                    "page": page,
                    "start": start,
                    "end": end,
                })

            # Move start position (with overlap)
            start = end - chunk_overlap

            # Update page number every 5000 characters
            if start > 0 and start % 5000 == 0:
                page += 1

        logger.info(f"Tokenized text into {len(chunks)} chunks")
        return chunks

    @staticmethod
    def _clean_text(text: str) -> str:
        """Clean and normalize text"""
        # Remove extra whitespace
        text = " ".join(text.split())

        # Remove special characters but keep sentence structure
        text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", text)

        return text.strip()

# Global parser instance
document_parser = DocumentParser()
