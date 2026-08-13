"""
GET /anomalies?session_id=<id>

Runs both detectors (statistical + Isolation Forest), deduplicates overlapping
detections by (field, timestamp), caches the result on the session, and returns
the Canonical API Contract shape.

Dedup rule (when both methods flag the same (field, timestamp)):
  - method   = "statistical+isolation_forest"
  - severity = max(stat, if) via SEVERITY_ORDER; tie -> statistical wins
  - detection_detail = stat_detail + " | " + if_detail
  - id = statistical_anomaly.id  (IF id is discarded)
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

import sessions
from anomaly import statistical, isolation_forest
from anomaly.models import Anomaly, SEVERITY_ORDER

router = APIRouter()


def _dedup(stat_anomalies: list[Anomaly], if_anomalies: list[Anomaly]) -> list[Anomaly]:
    """
    Merge and dedup anomalies from both detectors.

    Groups by (field, timestamp). When both methods flag the same pair, merges
    into a single "statistical+isolation_forest" anomaly following the canonical rule.
    """
    from collections import defaultdict

    groups: dict[tuple[str, str], dict] = defaultdict(lambda: {"stat": None, "if": None})

    for a in stat_anomalies:
        groups[(a.field, a.timestamp)]["stat"] = a

    for a in if_anomalies:
        groups[(a.field, a.timestamp)]["if"] = a

    merged: list[Anomaly] = []

    for (field, timestamp), pair in groups.items():
        stat = pair["stat"]
        ifo = pair["if"]

        if stat is not None and ifo is None:
            merged.append(stat)
        elif ifo is not None and stat is None:
            merged.append(ifo)
        else:
            stat_rank = SEVERITY_ORDER[stat.severity]
            if_rank = SEVERITY_ORDER[ifo.severity]
            if if_rank > stat_rank:
                severity = ifo.severity
            else:
                severity = stat.severity

            merged.append(Anomaly(
                id=stat.id,
                field=stat.field,
                timestamp=stat.timestamp,
                value=stat.value,
                severity=severity,
                method="statistical+isolation_forest",
                detection_detail=f"{stat.detection_detail} | {ifo.detection_detail}",
            ))

    return merged


@router.get("/anomalies")
async def get_anomalies(session_id: str):
    session = sessions.get_session(session_id)
    if session is None:
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "SESSION_NOT_FOUND", "message": f"Session '{session_id}' not found or expired."}},
        )

    # Return cached result if available
    if session.get("anomalies") is not None:
        return {
            "session_id": session_id,
            "anomalies": [a.model_dump() for a in session["anomalies"]],
        }

    df = session["dataframe"]

    stat_anomalies = statistical.detect(df)
    if_anomalies = isolation_forest.detect(df)

    anomalies = _dedup(stat_anomalies, if_anomalies)

    anomalies.sort(key=lambda a: a.timestamp)

    # Cache on session using update_session() -- preserves created_at,
    # unlike set_session() which would silently reset the TTL clock.
    sessions.update_session(session_id, anomalies=anomalies)

    return {
        "session_id": session_id,
        "anomalies": [a.model_dump() for a in anomalies],
    }
