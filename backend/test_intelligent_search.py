#!/usr/bin/env python3
"""
Test script for Intelligent Search functionality.

Run with: python test_intelligent_search.py
"""

import json
import requests
from typing import Dict, Any

# Configuration
API_BASE_URL = "http://localhost:8000"

def print_section(title: str):
    """Print a formatted section header"""
    print(f"\n{'='*80}")
    print(f" {title}")
    print(f"{'='*80}\n")

def test_intelligent_search(query: str, context: str = None, **kwargs) -> Dict[str, Any]:
    """Test the intelligent search endpoint"""
    print(f"Testing: {query}")
    if context:
        print(f"Context: {context}")

    payload = {
        "query": query,
        **({"context": context} if context else {}),
        **kwargs
    }

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/ai/intelligent-search",
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✓ Status: {response.status_code}")
            print(f"  Refined Query: {result.get('refined_query')}")
            print(f"  Intent: {result.get('intent')}")
            print(f"  LLM Confidence: {result.get('llm_confidence'):.2f}")
            print(f"  Results Found: {result.get('total_results')}")
            print(f"  Search Context: {result.get('search_context')}")
            return result
        else:
            print(f"✗ Status: {response.status_code}")
            print(f"  Error: {response.text}")
            return {}
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return {}

def test_search_recommendations(query: str) -> Dict[str, Any]:
    """Test the search recommendations endpoint"""
    print(f"Testing recommendations for: {query}")

    try:
        response = requests.get(
            f"{API_BASE_URL}/api/ai/search-recommendations",
            params={"query": query},
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✓ Status: {response.status_code}")
            print(f"  Refined Query: {result.get('refined_query')}")
            print(f"  Intent: {result.get('intent')}")
            print(f"  Key Terms: {', '.join(result.get('key_terms', []))}")
            print(f"  Industries: {result.get('suggested_filters', {}).get('industry')}")
            print(f"  Artifact Types: {', '.join(result.get('suggested_filters', {}).get('artifact_types', []))}")
            print(f"  Alternatives: {', '.join(result.get('alternative_searches', []))}")
            return result
        else:
            print(f"✗ Status: {response.status_code}")
            print(f"  Error: {response.text}")
            return {}
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return {}

def test_assistant_search(query: str) -> Dict[str, Any]:
    """Test the enhanced assistant search endpoint"""
    print(f"Testing assistant search: {query}")

    payload = {"query": query}

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/ai/assistant-search",
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✓ Status: {response.status_code}")
            print(f"  Original Query: {result.get('query')}")
            print(f"  Refined Query: {result.get('refined_query')}")
            print(f"  Intent: {result.get('intent')}")
            print(f"  Total Results: {result.get('total')} groups")
            print(f"  Groups: {', '.join(g['type'] for g in result.get('groups', []))}")
            return result
        else:
            print(f"✗ Status: {response.status_code}")
            print(f"  Error: {response.text}")
            return {}
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return {}

def main():
    """Run all tests"""
    print_section("INTELLIGENT SEARCH API TESTS")

    print("Prerequisites:")
    print("1. Backend server running on http://localhost:8000")
    print("2. Bedrock service configured (or graceful fallback enabled)")
    print("3. Vector database initialized with some artifacts")
    print()

    # Test 1: Basic intelligent search
    print_section("Test 1: Basic Intelligent Search")
    result1 = test_intelligent_search(
        query="cloud migration strategies"
    )
    if result1:
        print(f"\n  Top Result: {result1.get('results', [{}])[0].get('name') if result1.get('results') else 'None'}")

    # Test 2: Intelligent search with context
    print_section("Test 2: Intelligent Search with Context")
    result2 = test_intelligent_search(
        query="digital transformation",
        context="Financial Services industry, legacy systems, 3-year roadmap",
        limit=5
    )
    if result2:
        print(f"\n  Extracted Industry: {result2.get('extracted_context', {}).get('industry')}")
        print(f"  Extracted Tech: {result2.get('extracted_context', {}).get('technologies')}")

    # Test 3: Intelligent search with filters
    print_section("Test 3: Intelligent Search with Filters")
    result3 = test_intelligent_search(
        query="AI implementation",
        artifact_type="Case Study",
        industry="Healthcare",
        limit=10
    )

    # Test 4: Search recommendations
    print_section("Test 4: Search Recommendations")
    result4 = test_search_recommendations(
        query="how can we modernize our infrastructure"
    )

    # Test 5: Enhanced assistant search
    print_section("Test 5: Enhanced Assistant Search")
    result5 = test_assistant_search(
        query="microservices architecture patterns"
    )

    # Test 6: Complex query refinement
    print_section("Test 6: Complex Query Refinement")
    result6 = test_intelligent_search(
        query="whats the best way to move to cloud",
        limit=15
    )

    # Summary
    print_section("SUMMARY")
    print("Tests completed. Results:")
    print(f"✓ Test 1 (Basic Search): {'PASS' if result1 else 'FAIL'}")
    print(f"✓ Test 2 (With Context): {'PASS' if result2 else 'FAIL'}")
    print(f"✓ Test 3 (With Filters): {'PASS' if result3 else 'FAIL'}")
    print(f"✓ Test 4 (Recommendations): {'PASS' if result4 else 'FAIL'}")
    print(f"✓ Test 5 (Assistant Search): {'PASS' if result5 else 'FAIL'}")
    print(f"✓ Test 6 (Complex Query): {'PASS' if result6 else 'FAIL'}")

    print("\n" + "="*80)
    print("Intelligent Search Implementation Complete!")
    print("="*80)

if __name__ == "__main__":
    main()
