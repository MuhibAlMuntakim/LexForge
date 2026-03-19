import datetime
import os
from collections import Counter, defaultdict
from typing import Any, Dict, List

from src.legal_contract_ai.core.contract_memory import ContractMemory


class MetricsService:
    """Computes dashboard and analytics metrics from stored contract analyses."""

    def __init__(self, storage_dir: str = "data/contracts") -> None:
        self.storage_dir = storage_dir
        self.memory = ContractMemory(storage_dir=storage_dir)

    def load_analyses(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.storage_dir):
            return []

        items: List[Dict[str, Any]] = []
        for filename in os.listdir(self.storage_dir):
            if not filename.endswith(".json"):
                continue
            contract_id = filename.replace(".json", "")
            data = self.memory.get_analysis(contract_id)
            if data:
                items.append(data)

        items.sort(key=lambda item: item.get("timestamp", ""), reverse=True)
        return items

    def get_dashboard_metrics(self) -> Dict[str, Any]:
        analyses = self.load_analyses()

        cards = self._build_cards(analyses)
        amendment_impact = self._build_amendment_impact(analyses)
        risk_trend = self._build_risk_trend(analyses, limit=8)
        violation_distribution = self._build_violation_distribution(analyses, limit=8)
        recent_contracts = self._build_recent_contracts(analyses, limit=8)
        ai_insights = self._build_ai_insights(analyses, amendment_impact)

        return {
            **cards,
            **amendment_impact,
            "risk_trend": risk_trend,
            "violation_distribution": violation_distribution,
            "recent_contracts": recent_contracts,
            "ai_insights": ai_insights,
        }

    def get_analytics_metrics(self) -> Dict[str, Any]:
        analyses = self.load_analyses()
        return {
            "risk_distribution": self._build_risk_distribution(analyses),
            "violation_frequency": self._build_violation_distribution(analyses, limit=12),
            "vendor_risk_rankings": self._build_vendor_risk_rankings(analyses, limit=12),
            "contract_volume": self._build_contract_volume(analyses, limit=12),
        }

    def get_negotiations(self) -> List[Dict[str, Any]]:
        analyses = self.load_analyses()
        rows: List[Dict[str, Any]] = []

        for analysis in analyses:
            timestamp = analysis.get("timestamp", "")
            rows.append(
                {
                    "id": analysis.get("contract_id", ""),
                    "vendor": analysis.get("company_id", "unknown"),
                    "contract": f"Contract {str(analysis.get('contract_id', ''))[:8]}",
                    "status": self._derive_status(analysis),
                    "issues": len(analysis.get("redlines", [])) or len(analysis.get("violations", [])),
                    "last_activity": timestamp,
                }
            )

        return rows

    def _build_cards(self, analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
        current_month, previous_month = self._split_current_previous_month(analyses)

        total = len(analyses)
        total_prev = len(previous_month)

        high_total = self._count_high_risk(analyses)
        high_prev = self._count_high_risk(previous_month)

        avg_total = self._avg_risk(analyses)
        avg_prev = self._avg_risk(previous_month)

        pending_total = sum(1 for a in analyses if a.get("requires_manual_review"))
        pending_prev = sum(1 for a in previous_month if a.get("requires_manual_review"))

        return {
            "contracts_reviewed": total,
            "contracts_reviewed_change": total - total_prev,
            "high_risk_contracts": high_total,
            "high_risk_change": high_total - high_prev,
            "average_risk_score": round(avg_total, 1),
            "average_risk_change": round(avg_total - avg_prev, 1),
            "pending_reviews": pending_total,
            "pending_reviews_change": pending_total - pending_prev,
        }

    def _build_risk_trend(self, analyses: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
        month_scores: Dict[str, List[float]] = defaultdict(list)

        for item in analyses:
            dt = self._parse_ts(item.get("timestamp"))
            if not dt:
                continue
            risk_score = float(item.get("risk_assessment", {}).get("risk_score", 0))
            month_scores[dt.strftime("%Y-%m")].append(risk_score)

        labels = sorted(month_scores.keys())[-limit:]
        return [
            {
                "month": datetime.datetime.strptime(key, "%Y-%m").strftime("%b"),
                "score": round(sum(month_scores[key]) / max(len(month_scores[key]), 1), 1),
            }
            for key in labels
        ]

    def _build_violation_distribution(self, analyses: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
        counts: Counter[str] = Counter()
        for item in analyses:
            for violation in item.get("violations", []):
                clause = str(violation.get("clause", "Unknown")).replace("_", " ").title()
                counts[clause] += 1

        return [
            {"type": clause, "count": count}
            for clause, count in counts.most_common(limit)
        ]

    def _build_recent_contracts(self, analyses: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        for item in analyses[:limit]:
            risk_data = item.get("risk_assessment", {})
            rows.append(
                {
                    "id": item.get("contract_id", ""),
                    "vendor": item.get("company_id", "unknown"),
                    "name": f"Contract {str(item.get('contract_id', ''))[:8]}",
                    "risk": int(risk_data.get("risk_score", 0)),
                    "risk_level": str(risk_data.get("risk_level", "medium")).lower(),
                    "violations": len(item.get("violations", [])),
                    "status": self._derive_status(item),
                    "updated": item.get("timestamp", ""),
                }
            )
        return rows

    def _build_ai_insights(self, analyses: List[Dict[str, Any]], amendment_impact: Dict[str, int]) -> List[str]:
        if not analyses:
            return ["No contract analyses available yet. Upload and review contracts to populate insights."]

        insights: List[str] = []
        total = len(analyses)

        clause_counts = Counter()
        for item in analyses:
            seen = {str(v.get("clause", "")) for v in item.get("violations", [])}
            for clause in seen:
                if clause:
                    clause_counts[clause] += 1

        if clause_counts:
            top_clause, top_count = clause_counts.most_common(1)[0]
            pct = round((top_count / total) * 100)
            insights.append(f"{top_clause.replace('_', ' ').title()} appears in {pct}% of reviewed contracts.")

        high_risk = self._count_high_risk(analyses)
        if high_risk:
            insights.append(f"{high_risk} contracts currently fall in high-risk category.")

        avg_score = round(self._avg_risk(analyses), 1)
        insights.append(f"Average risk score across all reviewed contracts is {avg_score}.")

        manual_review = sum(1 for item in analyses if item.get("requires_manual_review"))
        if manual_review:
            insights.append(f"{manual_review} contracts require manual review before final sign-off.")

        amended_total = int(amendment_impact.get("amended_clauses_total", 0))
        if amended_total > 0:
            amended_high = int(amendment_impact.get("amended_high_risk_clauses", 0))
            amended_medium = int(amendment_impact.get("amended_medium_risk_clauses", 0))
            insights.append(
                f"{amended_total} clauses have been amended, including {amended_high} high-risk and {amended_medium} medium-risk issues."
            )

        return insights[:5]

    def _build_amendment_impact(self, analyses: List[Dict[str, Any]]) -> Dict[str, int]:
        totals = {
            "amended_clauses_total": 0,
            "amended_high_risk_clauses": 0,
            "amended_medium_risk_clauses": 0,
            "amended_low_risk_clauses": 0,
        }

        for analysis in analyses:
            accepted_indexes = set(analysis.get("accepted_redline_indexes", []))
            if not accepted_indexes:
                continue

            redlines = analysis.get("redlines", []) or []
            violations = analysis.get("violations", []) or []

            severity_by_clause: Dict[str, str] = {}
            for violation in violations:
                clause = str(violation.get("clause", "")).strip().lower()
                if clause and clause not in severity_by_clause:
                    severity_by_clause[clause] = str(violation.get("severity", "medium")).strip().lower()

            for idx in accepted_indexes:
                if idx < 0 or idx >= len(redlines):
                    continue

                totals["amended_clauses_total"] += 1
                clause = str(redlines[idx].get("violation", "")).strip().lower()
                severity = severity_by_clause.get(clause, "medium")

                if severity == "high":
                    totals["amended_high_risk_clauses"] += 1
                elif severity == "low":
                    totals["amended_low_risk_clauses"] += 1
                else:
                    totals["amended_medium_risk_clauses"] += 1

        return totals

    def _build_risk_distribution(self, analyses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        low = 0
        medium = 0
        high = 0

        for item in analyses:
            score = int(item.get("risk_assessment", {}).get("risk_score", 0))
            if score <= 30:
                low += 1
            elif score <= 60:
                medium += 1
            else:
                high += 1

        return [
            {"name": "Low (0-30)", "value": low},
            {"name": "Medium (31-60)", "value": medium},
            {"name": "High (61-100)", "value": high},
        ]

    def _build_vendor_risk_rankings(self, analyses: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
        grouped_scores: Dict[str, List[int]] = defaultdict(list)
        for item in analyses:
            vendor = str(item.get("company_id", "unknown"))
            score = int(item.get("risk_assessment", {}).get("risk_score", 0))
            grouped_scores[vendor].append(score)

        rows = [
            {
                "vendor": vendor,
                "score": round(sum(scores) / max(len(scores), 1), 1),
            }
            for vendor, scores in grouped_scores.items()
        ]
        rows.sort(key=lambda item: item["score"], reverse=True)
        return rows[:limit]

    def _build_contract_volume(self, analyses: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
        month_counts: Counter[str] = Counter()
        for item in analyses:
            dt = self._parse_ts(item.get("timestamp"))
            if not dt:
                continue
            month_counts[dt.strftime("%Y-%m")] += 1

        labels = sorted(month_counts.keys())[-limit:]
        return [
            {
                "month": datetime.datetime.strptime(key, "%Y-%m").strftime("%b"),
                "count": month_counts[key],
            }
            for key in labels
        ]

    def _derive_status(self, analysis: Dict[str, Any]) -> str:
        explicit = str(analysis.get("negotiation_status", "")).strip().lower()
        if explicit in {"reviewed", "pending", "in_review", "approved", "rejected", "negotiating", "under_review"}:
            return explicit

        if analysis.get("requires_manual_review"):
            return "under_review"
        if len(analysis.get("redlines", [])) > 0:
            return "negotiating"
        if len(analysis.get("violations", [])) == 0:
            return "approved"
        return "reviewed"

    def _split_current_previous_month(
        self, analyses: List[Dict[str, Any]]
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        now = datetime.datetime.now()
        current_key = now.strftime("%Y-%m")

        previous_month = now.replace(day=1) - datetime.timedelta(days=1)
        previous_key = previous_month.strftime("%Y-%m")

        current = []
        previous = []
        for item in analyses:
            dt = self._parse_ts(item.get("timestamp"))
            if not dt:
                continue
            key = dt.strftime("%Y-%m")
            if key == current_key:
                current.append(item)
            elif key == previous_key:
                previous.append(item)

        return current, previous

    def _parse_ts(self, value: Any) -> datetime.datetime | None:
        if not value:
            return None
        try:
            return datetime.datetime.fromisoformat(str(value))
        except Exception:
            return None

    def _count_high_risk(self, analyses: List[Dict[str, Any]]) -> int:
        count = 0
        for item in analyses:
            level = str(item.get("risk_assessment", {}).get("risk_level", "")).lower()
            score = int(item.get("risk_assessment", {}).get("risk_score", 0))
            if level == "high" or score > 60:
                count += 1
        return count

    def _avg_risk(self, analyses: List[Dict[str, Any]]) -> float:
        if not analyses:
            return 0.0
        values = [int(item.get("risk_assessment", {}).get("risk_score", 0)) for item in analyses]
        return float(sum(values)) / max(len(values), 1)
