from __future__ import annotations

from datetime import datetime, timedelta, timezone


class AgendaService:
    def __init__(self, session_repository):
        self._session_repository = session_repository

    def get_sessions_agenda(self, org_id: str) -> list[dict]:
        sessions = self._session_repository.scan_by_org(org_id)

        now = datetime.now(timezone.utc)
        monday = now - timedelta(days=now.weekday())
        monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)

        agenda = []
        for item in sessions:
            date_str = item.get("date")
            if not date_str:
                continue
            try:
                dt = datetime.fromisoformat(str(date_str))
            except ValueError:
                try:
                    dt = datetime.strptime(str(date_str), "%Y-%m-%d")
                except ValueError:
                    continue

            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            day_offset = (dt.date() - monday.date()).days
            if day_offset < 0 or day_offset > 6:
                continue

            hour = item.get("hour")
            if hour is None:
                hh = item.get("time")
                if isinstance(hh, str) and ":" in hh:
                    hour = int(hh.split(":")[0])
                else:
                    hour = 14

            agenda.append(
                {
                    "dayOffset": day_offset,
                    "hour": int(hour),
                    "patientId": item.get("patientId"),
                    "type": item.get("type", "remote"),
                }
            )

        return agenda
