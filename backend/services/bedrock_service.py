import boto3
import json
import logging
from typing import Optional, List
from config import settings

logger = logging.getLogger(__name__)


class BedrockService:
    def __init__(self):
        self.region = settings.aws_region
        self.model_id = settings.bedrock_model_id
        try:
            self.client = boto3.client(
                'bedrock-runtime',
                region_name=self.region
            )
            self.available = True
        except Exception as e:
            logger.error(f"Failed to initialize Bedrock client: {e}")
            self.available = False

    def is_available(self) -> bool:
        return self.available

    def generate_opportunity_summary(self, opportunity: dict) -> Optional[str]:
        """Generate AI summary for an opportunity"""
        if not self.available:
            return None

        prompt = f"""
        Provide a professional summary of this opportunity:

        Name: {opportunity.get('name')}
        Customer: {opportunity.get('customer')}
        Industry: {opportunity.get('industry')}
        Business Problem: {opportunity.get('business_problem')}
        Requirements: {opportunity.get('requirements')}
        Proposed Solution: {opportunity.get('proposed_solution')}
        Technologies: {opportunity.get('technologies')}

        Summarize:
        - Customer
        - Business problem
        - Requirements
        - Proposed solution
        - Risks
        - Next steps
        """

        return self._invoke_model(prompt)

    def generate_artifact_summary(self, artifact: dict) -> Optional[str]:
        """Generate AI summary for an artifact"""
        if not self.available:
            return None

        prompt = f"""
        Provide a professional summary of this artifact:

        Name: {artifact.get('name')}
        Type: {artifact.get('artifact_type')}
        Description: {artifact.get('description')}
        Technologies: {artifact.get('technologies')}
        Industry: {artifact.get('industry')}

        Include:
        - Executive summary
        - Purpose
        - Applicable scenarios
        - Key technologies
        - Target industries
        """

        return self._invoke_model(prompt)

    def recommend_artifacts(self, opportunity: dict, available_artifacts: List[dict]) -> Optional[List[dict]]:
        """Recommend artifacts for an opportunity"""
        if not self.available:
            return None

        artifacts_list = "\n".join([
            f"- ID: {a['id']}, Name: {a['name']}, Type: {a['artifact_type']}, Industry: {a['industry']}"
            for a in available_artifacts
        ])

        prompt = f"""
        Analyze this opportunity and recommend from the available artifacts:

        OPPORTUNITY:
        Name: {opportunity.get('name')}
        Industry: {opportunity.get('industry')}
        Business Problem: {opportunity.get('business_problem')}
        Requirements: {opportunity.get('requirements')}
        Technologies: {opportunity.get('technologies')}

        AVAILABLE ARTIFACTS:
        {artifacts_list}

        For each recommended artifact, provide:
        1. Artifact ID
        2. Artifact Name
        3. Why it's relevant
        4. Relevance score (1-10)

        Format your response as JSON with array of recommendations.
        """

        try:
            response = self._invoke_model(prompt)
            if response:
                import re
                json_match = re.search(r'\[.*\]', response, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
        except Exception as e:
            logger.error(f"Failed to parse recommendations: {e}")

        return None

    def analyze_opportunity(self, opportunity: dict) -> Optional[str]:
        """Analyze opportunity comprehensively"""
        if not self.available:
            return None

        prompt = f"""
        Provide a comprehensive analysis of this opportunity:

        Name: {opportunity.get('name')}
        Customer: {opportunity.get('customer')}
        Industry: {opportunity.get('industry')}
        Business Problem: {opportunity.get('business_problem')}
        Requirements: {opportunity.get('requirements')}
        Stage: {opportunity.get('stage')}

        Include:
        - Business challenge summary
        - Key requirements analysis
        - Potential solution direction
        - Technology considerations
        - Risks and mitigation
        - Assumptions
        - Missing information
        - Recommended next steps

        Format as a clear, structured analysis.
        """

        return self._invoke_model(prompt)

    def _invoke_model(self, prompt: str) -> Optional[str]:
        """Invoke the Bedrock model"""
        if not self.available:
            return None

        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-06-01",
                "max_tokens": 1024,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            })

            response = self.client.invoke_model(
                modelId=self.model_id,
                body=body
            )

            result = json.loads(response['body'].read())
            if 'content' in result and len(result['content']) > 0:
                return result['content'][0]['text']
            return None
        except Exception as e:
            logger.error(f"Error invoking Bedrock model: {e}")
            return None

    def get_health_status(self) -> dict:
        """Get health status of Bedrock service"""
        return {
            "bedrock_configured": self.available,
            "aws_region": self.region,
            "configured_model": self.model_id,
            "connectivity_status": "connected" if self.available else "unavailable"
        }


bedrock_service = BedrockService()
