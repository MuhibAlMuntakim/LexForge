import json
import logging
import os
from typing import Dict, List, Any, Optional
from litellm import completion
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class AiRiskDiscovery:
    """
    Advisory layer for detecting risks not covered by the deterministic playbook.
    """
    
    def __init__(self):
        self.model = "gemini/gemini-2.5-flash"
        self.api_key = os.getenv("GEMINI_API_KEY")

    def discover_risks(self, contract_text: str) -> Dict[str, Any]:
        """
        Analyzes contract text for risks not covered in the playbook.
        """
        logger.info("Discovering advisory risks...")
        
        prompt = f"""
        ### Targeted Advisory Risks to Identify:
        - **Auto-renewal clauses**: Hidden renewal chains or difficult opt-out mechanisms.
        - **Vendor assignment rights**: Rights to transfer the contract without customer consent.
        - **Subprocessor usage**: Permission to use subprocessors without customer approval or notice.
        - **Service suspension rights**: Broad or vague rights for the vendor to suspend service (e.g., for "any breach").
        - **Weak SLA language**: Phrases like "commercially reasonable efforts" instead of firm guarantees.
        - **Data usage or analytics rights**: Rights for the vendor to use customer data for their own analytics or "AI training" without explicit opt-in.
        
        ### Contract Text (Partial):
        ---
        {contract_text[:15000]}
        ---
        
        ### Requirements:
        1. **Focus**: Identify only genuine advisory risks not covered by deterministic rules (liability, indemnity, etc.).
        2. **Output**: Return a JSON object with a list of 'ai_observations'. Use "low", "medium", or "high" for severity.
        
        ### Required Output Format:
        {{
          "ai_observations": [
            {{
              "risk": "Risk Name",
              "severity": "low | medium | high",
              "explanation": "Detailed explanation of the risk and its impact."
            }}
          ]
        }}
        
        Return ONLY the raw JSON object.
        """
        
        try:
            response = completion(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional legal risk consultant. Identify advisory risks that are often missed. Output only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                api_key=self.api_key,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            # Clean up potential markdown wrappers
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            
            result = json.loads(content)
            return result
            
        except Exception as e:
            logger.error(f"Error in AI risk discovery: {e}")
            return {
                "ai_observations": [],
                "error": str(e)
            }

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    discovery = AiRiskDiscovery()
    print(json.dumps(discovery.discover_risks("Sample contract text with auto-renewal."), indent=2))
