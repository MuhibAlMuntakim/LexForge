import re
import json
import logging
from typing import Dict, List, Optional
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ClauseExtractor:
    """Module to split contracts into semantic clauses."""
    
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        # Using Llama 4 Scout: Modern, high TPM (30K)
        self.model = os.getenv("EXTRACTION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
        self.clause_types = [
            "termination", "liability", "indemnity", 
            "confidentiality", "governing_law", "data_ownership", 
            "payment_terms", "renewal_clauses"
        ]
        
    def extract_clauses(self, contract_text: str) -> Dict[str, Optional[str]]:
        """
        Extracts key clauses from contract text.
        Uses a hybrid approach with robust LLM extraction and gap detection.
        """
        logger.info("Starting clause extraction process...")
        
        prompt = f"""
        Analyze the following legal contract and extract the exact text for these specific clauses:
        {', '.join(self.clause_types)}
        
        ### Instructions:
        1. **Extraction**: Copy the relevant text for each clause exactly as it appears.
        2. **Gap Detection**: If a clause is missing or not explicitly mentioned, return `null` for that key.
        3. **Normalization**: Ensure the output is a valid JSON object with ALL these keys: {', '.join(self.clause_types)}.
        4. **Data Ownership**: Pay special attention to data rights and ownership.
        
        ### Contract Text (Partial):
        ---
        {contract_text[:12000]} 
        ---
        
        Return ONLY a raw JSON object.
        """
        
        try:
            response = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a professional legal technologist. Extract clauses into normalized JSON. Use null for missing clauses."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                response_format={"type": "json_object"}
            )
            
            # Parse result
            result = json.loads(response.choices[0].message.content)
            
            # Normalize results: Ensure all values are strings or None to satisfy API schema
            normalized_result = {}
            for clause in self.clause_types:
                val = result.get(clause)
                if isinstance(val, dict):
                    # If LLM returned a dict (e.g. with 'clause' and 'metadata'), extract the text
                    normalized_result[clause] = val.get("clause") or json.dumps(val)
                elif val is not None:
                    normalized_result[clause] = str(val)
                else:
                    normalized_result[clause] = None
                    
            logger.info("Successfully extracted and normalized clauses.")
            return normalized_result
            
        except Exception as e:
            logger.error(f"Error in clause extraction: {e}")
            # Return partial or empty results with nulls for consistency
            return {ct: None for ct in self.clause_types}

if __name__ == "__main__":
    print("Clause Extractor initialized.")
