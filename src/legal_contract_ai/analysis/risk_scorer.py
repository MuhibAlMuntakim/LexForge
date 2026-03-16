import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class RiskScorer:
    """
    Calculates a quantitative risk score based on playbook violations.
    """
    
    def __init__(self):
        # Weighting: High (25), Medium (10), Low (5)
        self.weights = {
            "high": 25,
            "medium": 10,
            "low": 5
        }

    def calculate_score(self, violations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generates a contract-level risk score.
        Constraint: Evaluates only playbook violations. AI observations are ignored.
        """
        logger.info("Calculating risk score...")
        
        total_score = 0
        counts = {
            "high": 0,
            "medium": 0,
            "low": 0
        }
        
        for violation in violations:
            severity = violation.get("severity", "low").lower()
            if severity in self.weights:
                total_score += self.weights[severity]
                counts[severity] += 1
            else:
                # Default to low if unknown
                total_score += self.weights["low"]
                counts["low"] += 1
                
        # Cap total score at 100
        risk_score = min(total_score, 100)
        
        # Determine risk level
        risk_level = "Low Risk"
        if risk_score > 50:
            risk_level = "High Risk"
        elif risk_score > 20:
            risk_level = "Medium Risk"
            
        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "violation_counts": counts
        }

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    scorer = RiskScorer()
    test_violations = [
        {"severity": "high"},
        {"severity": "high"},
        {"severity": "medium"},
        {"severity": "low"}
    ]
    print(scorer.calculate_score(test_violations))
