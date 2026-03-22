from __future__ import annotations

import re
from typing import Any, Dict, List


def normalize_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip().lower()


def _severity_rank(value: str) -> int:
    sev = str(value or "").strip().lower()
    if sev == "high":
        return 3
    if sev == "medium":
        return 2
    if sev == "low":
        return 1
    return 0


def deduplicate_violations(violations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Collapse duplicate/overlapping findings that point to the same clause text.
    Group key: normalized clause name + normalized original clause text.
    """
    if not violations:
        return []

    grouped: Dict[str, Dict[str, Any]] = {}

    for item in violations:
        clause = normalize_text(item.get("clause"))
        original_clause = normalize_text(item.get("original_clause"))
        key = f"{clause}::{original_clause}"

        if key not in grouped:
            grouped[key] = {
                "items": [item],
                "issues": [],
                "policies": [],
                "attributes": [],
            }
        else:
            grouped[key]["items"].append(item)

        issue = str(item.get("issue") or "").strip()
        if issue and issue not in grouped[key]["issues"]:
            grouped[key]["issues"].append(issue)

        policy = str(item.get("policy") or "").strip()
        if policy and policy not in grouped[key]["policies"]:
            grouped[key]["policies"].append(policy)

        attribute = str(item.get("attribute") or "").strip()
        if attribute and attribute not in grouped[key]["attributes"]:
            grouped[key]["attributes"].append(attribute)

    merged: List[Dict[str, Any]] = []
    for aggregate in grouped.values():
        items = aggregate["items"]
        primary = max(items, key=lambda x: _severity_rank(str(x.get("severity") or "")))
        merged_item = dict(primary)

        issues = aggregate["issues"]
        if issues:
            combined_issue = issues[0]
            if len(issues) > 1:
                combined_issue = f"{issues[0]} Additional findings: {'; '.join(issues[1:])}"
            merged_item["issue"] = combined_issue
            merged_item["violation_reason"] = combined_issue

        policies = aggregate["policies"]
        if policies:
            merged_item["policy"] = " | ".join(policies)

        attributes = aggregate["attributes"]
        if attributes:
            merged_item["attribute"] = ", ".join(attributes)

        if not merged_item.get("playbook_template"):
            for candidate in items:
                template = str(candidate.get("playbook_template") or "").strip()
                if template:
                    merged_item["playbook_template"] = template
                    break

        merged.append(merged_item)

    return merged
