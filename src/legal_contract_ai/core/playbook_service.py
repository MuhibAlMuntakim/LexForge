import copy
import datetime
import json
import os
import re
import uuid
from typing import Any, Dict, List, Optional


class PlaybookService:
    """Persist and resolve company-scoped playbooks."""

    def __init__(
        self,
        default_playbook_path: str = "data/playbooks/default_playbook.json",
        custom_playbooks_dir: str = "data/playbooks/custom",
    ) -> None:
        self.default_playbook_path = default_playbook_path
        self.custom_playbooks_dir = custom_playbooks_dir
        os.makedirs(self.custom_playbooks_dir, exist_ok=True)

    def _sanitize_company_id(self, company_id: str) -> str:
        cleaned = (company_id or "default_co").strip() or "default_co"
        cleaned = re.sub(r"[^a-zA-Z0-9_\-.]", "_", cleaned)
        return cleaned

    def _company_dir(self, company_id: str) -> str:
        safe_company_id = self._sanitize_company_id(company_id)
        path = os.path.join(self.custom_playbooks_dir, safe_company_id)
        os.makedirs(path, exist_ok=True)
        return path

    def _company_playbook_path(self, company_id: str, playbook_id: str) -> str:
        return os.path.join(self._company_dir(company_id), f"{playbook_id}.json")

    def _read_json(self, path: str) -> Dict[str, Any]:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_json(self, path: str, data: Dict[str, Any]) -> None:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def _to_playbook_response(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        rules = payload.get("rules", []) or []
        return {
            "playbook_id": str(payload.get("playbook_id", "")),
            "name": str(payload.get("name") or "Untitled Playbook"),
            "description": str(payload.get("description") or ""),
            "company_id": str(payload.get("company_id") or "default_co"),
            "is_default": bool(payload.get("is_default", False)),
            "playbook_version": str(payload.get("playbook_version") or "1.0"),
            "rules": rules,
            "rule_count": len(rules),
            "created_at": str(payload.get("created_at") or ""),
            "updated_at": str(payload.get("updated_at") or ""),
        }

    def _default_payload(self) -> Dict[str, Any]:
        default_data = self._read_json(self.default_playbook_path)
        now = datetime.datetime.utcnow().isoformat()
        return {
            "playbook_id": "default",
            "name": "Default Playbook",
            "description": "System default legal playbook.",
            "company_id": "global",
            "is_default": True,
            "playbook_version": str(default_data.get("playbook_version", "1.0")),
            "rules": default_data.get("rules", []),
            "created_at": now,
            "updated_at": now,
        }

    def list_playbooks(self, company_id: str) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = [self._to_playbook_response(self._default_payload())]
        company_folder = self._company_dir(company_id)
        for filename in sorted(os.listdir(company_folder)):
            if not filename.endswith(".json"):
                continue
            path = os.path.join(company_folder, filename)
            try:
                payload = self._read_json(path)
                results.append(self._to_playbook_response(payload))
            except Exception:
                continue
        return results

    def get_playbook(self, company_id: str, playbook_id: str) -> Dict[str, Any]:
        if playbook_id == "default":
            return self._to_playbook_response(self._default_payload())

        path = self._company_playbook_path(company_id, playbook_id)
        if not os.path.exists(path):
            raise FileNotFoundError("Playbook not found")
        return self._to_playbook_response(self._read_json(path))

    def create_playbook(
        self,
        company_id: str,
        name: str,
        description: str,
        rules: List[Dict[str, Any]],
        playbook_version: str = "1.0",
    ) -> Dict[str, Any]:
        playbook_id = str(uuid.uuid4())
        now = datetime.datetime.utcnow().isoformat()
        payload = {
            "playbook_id": playbook_id,
            "name": (name or "Untitled Playbook").strip() or "Untitled Playbook",
            "description": (description or "").strip(),
            "company_id": self._sanitize_company_id(company_id),
            "is_default": False,
            "playbook_version": str(playbook_version or "1.0"),
            "rules": rules or [],
            "created_at": now,
            "updated_at": now,
        }
        self._write_json(self._company_playbook_path(company_id, playbook_id), payload)
        return self._to_playbook_response(payload)

    def update_playbook(
        self,
        company_id: str,
        playbook_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        rules: Optional[List[Dict[str, Any]]] = None,
        playbook_version: Optional[str] = None,
    ) -> Dict[str, Any]:
        if playbook_id == "default":
            raise ValueError("Default playbook cannot be modified")

        path = self._company_playbook_path(company_id, playbook_id)
        if not os.path.exists(path):
            raise FileNotFoundError("Playbook not found")

        payload = self._read_json(path)
        if name is not None:
            payload["name"] = (name or "").strip() or payload.get("name", "Untitled Playbook")
        if description is not None:
            payload["description"] = (description or "").strip()
        if rules is not None:
            payload["rules"] = rules
        if playbook_version is not None:
            payload["playbook_version"] = str(playbook_version)
        payload["updated_at"] = datetime.datetime.utcnow().isoformat()

        self._write_json(path, payload)
        return self._to_playbook_response(payload)

    def delete_playbook(self, company_id: str, playbook_id: str) -> None:
        if playbook_id == "default":
            raise ValueError("Default playbook cannot be deleted")
        path = self._company_playbook_path(company_id, playbook_id)
        if not os.path.exists(path):
            raise FileNotFoundError("Playbook not found")
        os.remove(path)

    def resolve_for_review(self, company_id: str, playbook_id: Optional[str]) -> Dict[str, Any]:
        selected = (playbook_id or "default").strip() or "default"
        if selected == "default":
            payload = self._default_payload()
            return {
                "playbook_id": "default",
                "name": payload.get("name", "Default Playbook"),
                "version": payload.get("playbook_version", "1.0"),
                "path": self.default_playbook_path,
            }

        payload = self.get_playbook(company_id, selected)
        # Materialize a temporary resolved playbook file for the deterministic engine.
        resolved_path = self._company_playbook_path(company_id, selected)
        if not os.path.exists(resolved_path):
            raise FileNotFoundError("Playbook not found")

        # Ensure deterministic engine receives only expected shape.
        resolved_data = {
            "playbook_version": payload.get("playbook_version", "1.0"),
            "company_id": payload.get("company_id", self._sanitize_company_id(company_id)),
            "rules": copy.deepcopy(payload.get("rules", [])),
        }
        self._write_json(resolved_path, resolved_data)
        return {
            "playbook_id": payload["playbook_id"],
            "name": payload.get("name", "Custom Playbook"),
            "version": payload.get("playbook_version", "1.0"),
            "path": resolved_path,
        }