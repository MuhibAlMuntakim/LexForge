import json
import os
import logging
from typing import List, Dict, Any, Optional

# Set up logging
logger = logging.getLogger(__name__)

class PlaybookRuleEngine:
    """
    Deterministic rule engine for legal playbook compliance.
    Matches extracted clauses against structured policy rules.
    """
    
    def __init__(self, playbook_path: str = "data/playbooks/default_playbook.json"):
        self.playbook_path = playbook_path
        self.data = self._load_playbook()
        self.rules = self.data.get("rules", [])
        self.version = self.data.get("playbook_version", "1.0")

    def _load_playbook(self) -> Dict[str, Any]:
        if not os.path.exists(self.playbook_path):
            logger.warning(f"Playbook file not found at {self.playbook_path}")
            return {"rules": [], "playbook_version": "0.0"}
            
        with open(self.playbook_path, 'r') as f:
            return json.load(f)

    def _coerce_number(self, value: Any) -> Optional[float]:
        try:
            if value is None:
                return None
            return float(value)
        except (TypeError, ValueError):
            return None

    def _coerce_bool(self, value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in {"true", "yes", "1"}
        if isinstance(value, (int, float)):
            return bool(value)
        return False

    def _coerce_list(self, value: Any) -> List[Any]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return [value]

    def check_compliance(self, classification: Dict[str, Any], raw_clauses: Dict[str, str]) -> Dict[str, Any]:
        """
        Evaluates structured attributes from classification against deterministic rules.
        Returns violations and risks.
        """
        logger.info(f"Evaluating playbook compliance (v{self.version})...")
        violations = []
        risks = {
            "high": [],
            "medium": [],
            "low": []
        }
        
        clauses_data = classification.get("clauses", {})
        
        for rule in self.rules:
            clause_type = rule["clause"]
            attribute = rule.get("attribute")
            expected = rule.get("expected")
            severity = rule.get("severity", "medium")
            rule_type = rule.get("type", "violation")
            
            # Get the classified attribute value
            clause_info = clauses_data.get(clause_type, {})
            current_val = clause_info.get(attribute) if attribute else None
            
            # Robust existance check: check the 'exists' flag OR presence of raw text
            raw_text = raw_clauses.get(clause_type, "")
            clause_exists = clause_info.get("exists", False) or (len(raw_text) > 20 and "not specified" not in raw_text.lower())
            
            # 1. Check for Missing Required Clauses
            if rule.get("required") and not clause_exists:
                logger.warning(f"Required clause missing: {clause_type}")
                violation = {
                    "clause": clause_type,
                    "issue": "Missing required clause",
                    "severity": "high",
                    "violation_reason": f"Contract is missing the required '{clause_type}' clause.",
                    "policy": rule.get("policy"),
                    "original_clause": "Not present in contract.",
                    "playbook_template": rule.get("template", "Standard clause required.")
                }
                violations.append(violation)
                risks["high"].append(f"Missing {clause_type.replace('_', ' ')} clause")
                continue

            # Skip if clause doesn't exist and wasn't required
            if not clause_exists:
                continue

            # 2. Check Deterministic Value Comparison
            violated = False
            v_reason = ""
            
            if attribute:
                # Special logic for Confidentiality Survival Years
                if clause_type == "confidentiality" and attribute == "survival_years":
                    try:
                        val = int(current_val) if current_val is not None else 0
                        min_survival = int(rule.get("expected", 3))
                        if val < min_survival:
                            violated = True
                            v_reason = f"Confidentiality obligations must survive for at least {min_survival} years. Found: {val}."
                    except (ValueError, TypeError):
                        violated = True
                        v_reason = "Confidentiality survival years could not be determined."
                
                # Standard Logic for other attributes
                elif rule_type == "preference" and "preferred" in rule:
                    if current_val not in rule["preferred"]:
                        violated = True
                        v_reason = f"Value '{current_val}' is not in preferred list: {rule['preferred']}"

                elif "disallowed_overlap" in rule:
                    current_values = {str(x).strip().lower() for x in self._coerce_list(current_val) if x is not None}
                    blocked_values = {str(x).strip().lower() for x in self._coerce_list(rule.get("disallowed_overlap"))}
                    overlap = sorted(current_values.intersection(blocked_values))
                    if overlap:
                        violated = True
                        v_reason = f"Contains disallowed values: {overlap}"

                elif "forbidden_values" in rule:
                    current_values = {str(x).strip().lower() for x in self._coerce_list(current_val) if x is not None}
                    forbidden_values = {str(x).strip().lower() for x in self._coerce_list(rule.get("forbidden_values"))}
                    overlap = sorted(current_values.intersection(forbidden_values))
                    if overlap:
                        violated = True
                        v_reason = f"Contains forbidden values: {overlap}"
                
                elif "allowed" in rule:
                    if current_val not in rule["allowed"]:
                        violated = True
                        v_reason = f"Value '{current_val}' is not in allowed list: {rule['allowed']}"
                
                elif "max_val" in rule:
                    current_num = self._coerce_number(current_val)
                    max_num = self._coerce_number(rule.get("max_val"))
                    if current_num is not None and max_num is not None and current_num > max_num:
                        violated = True
                        v_reason = f"Value {current_val} exceeds maximum allowed {rule['max_val']}"

                elif "min_val" in rule:
                    current_num = self._coerce_number(current_val)
                    min_num = self._coerce_number(rule.get("min_val"))
                    if current_num is not None and min_num is not None and current_num < min_num:
                        violated = True
                        v_reason = f"Value {current_val} is below minimum required {rule['min_val']}"
                
                elif expected is not None:
                    # Bool expectation with tolerant coercion avoids string/bool mismatch noise.
                    if isinstance(expected, bool):
                        if self._coerce_bool(current_val) != expected:
                            violated = True
                            v_reason = f"Value '{current_val}' does not match expected '{expected}'"
                    else:
                        if current_val != expected:
                            violated = True
                            v_reason = f"Value '{current_val}' does not match expected '{expected}'"

            if violated:
                logger.info(f"Rule {rule_type} found in {clause_type}: {v_reason}")
                
                # Override severity for preference violations to low
                current_severity = "low" if rule_type == "preference" else severity
                
                violation = {
                    "clause": clause_type,
                    "attribute": attribute,
                    "issue": v_reason,
                    "severity": current_severity,
                    "violation_reason": v_reason,
                    "policy": rule.get("policy"),
                    "original_clause": raw_clauses.get(clause_type, "See contract text."),
                    "playbook_template": rule.get("template") if rule.get("template") else None
                }
                
                # All detected violations (including preferences) should be added to the list
                violations.append(violation)
                risks[current_severity.lower()].append(f"{clause_type.replace('_', ' ')}: {rule.get('policy')}")

        logger.info(f"Compliance check complete. Found {len(violations)} violations.")
        return {
            "violations": violations,
            "risks": risks,
            "playbook_version": self.version
        }

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = PlaybookRuleEngine()
    test_classification = {
        "clauses": {
            "liability": {"exists": True, "cap_type": "unlimited"},
            "indemnity": {"exists": True, "type": "vendor_only"}
        }
    }
    test_raw = {"liability": "Unlimited liability applies.", "indemnity": "Vendor only indemnity."}
    result = engine.check_compliance(test_classification, test_raw)
    print(json.dumps(result, indent=2))
