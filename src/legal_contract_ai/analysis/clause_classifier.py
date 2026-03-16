import json
import logging
import os
from typing import Dict, Any, Optional
from litellm import completion
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class ClauseClassifier:
    """
    Structural interpreter for legal clauses.
    Converts raw clause text into structured attributes.
    """
    
    def __init__(self):
        self.model = "gemini/gemini-2.5-flash"
        self.api_key = os.getenv("GEMINI_API_KEY")

    def classify_clauses(self, contract_text: str) -> Dict[str, Any]:
        """
        Extracts and classifies clauses into a structured schema.
        Responsibility: Structural interpretation ONLY.
        """
        logger.info("Extracting and classifying clauses...")
        
        prompt = f"""
        Analyze the following legal contract. For each of the specified clause types, extract the exact text and classify its structural attributes.
        
        ### Clause Types:
        - liability
        - indemnity
        - termination
        - confidentiality
        - payment_terms
        - governing_law
        
        ### Instructions:
        1. **Extraction**: Provide the exact text found in the contract for each clause.
        2. **Classification**: Identify structural attributes (e.g., liability cap type, indemnity scope).
        3. **Confidence**: Provide a `confidence_score` (0.0 to 1.0) for each classification.
        4. **Neutrality**: Do NOT detect risks or playbook violations. Only interpret structure.
        5. **Manual Review**: Use confidence_score < 0.7 as a guideline for internal flags.
        
        ### Contract Text:
        {contract_text[:30000]}
        
        ### Required Output Schema:
        {{
          "raw_clauses": {{
            "clause_type": "exact text from contract or 'Not specified'"
          }},
          "clauses": {{
            "liability": {{
              "exists": boolean,
              "cap_type": "annual_value | 12_months_fees | unlimited | unknown",
              "is_unlimited": boolean,
              "confidence_score": float
            }},
            "indemnity": {{
              "exists": boolean,
              "type": "mutual | customer_only | vendor_only | unknown",
              "confidence_score": float
            }},
            "termination": {{
              "exists": boolean,
              "customer_convenience": boolean,
              "vendor_convenience": boolean,
              "confidence_score": float
            }},
            "confidentiality": {{
              "exists": boolean,
              "mutual": boolean,
              "survival_years": integer or null,
              "confidence_score": float
            }},
            "payment_terms": {{
              "exists": boolean,
              "net_days": integer or null,
              "confidence_score": float
            }},
            "governing_law": {{
              "exists": boolean,
              "state": "string or unknown",
              "confidence_score": float
            }}
          }}
        }}
        
        Return ONLY the raw JSON object.
        """
        
        try:
            response = completion(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional legal analyst. Extract and classify clauses. Output only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                api_key=self.api_key,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            
            classification = json.loads(content)
            
            # Post-process: Add requires_manual_review flag
            classification["requires_manual_review"] = False
            for clause_name, attributes in classification.get("clauses", {}).items():
                if isinstance(attributes, dict) and "confidence_score" in attributes:
                    if attributes["confidence_score"] < 0.7:
                        classification["requires_manual_review"] = True
                        break
                        
            return classification
            
        except Exception as e:
            logger.error(f"Error in clause classification: {e}")
            return {
                "raw_clauses": {},
                "clauses": {},
                "requires_manual_review": True,
                "error": str(e)
            }

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    classifier = ClauseClassifier()
    test_data = {"liability": "Vendor liability is limited to 12 months of fees.", "indemnity": "Mutual indemnification applies."}
    print(json.dumps(classifier.classify_clauses(test_data), indent=2))
