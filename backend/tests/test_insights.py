"""
Tests for POST /insights (Sub-Task 6).
"""

import asyncio
import json
from unittest.mock import patch

import sessions
from anomaly.models import Anomaly
from api.routes_insights import post_insights, InsightsRequest

_ANOMALIES = [
    Anomaly(
        id="aaa111",
        field="battery_voltage",
        timestamp="2024-01-01T02:00:00Z",
        value=20.5,
        severity="high",
        method="statistical+isolation_forest",
        detection_detail="Value 20.50 is 25.0% outside the nominal lower bound 26.0 V.",
    ),
    Anomaly(
        id="bbb222",
        field="temperature_c",
        timestamp="2024-01-01T04:20:00Z",
        value=55.0,
        severity="high",
        method="statistical",
        detection_detail="Value 55.00 C is 50.0% above the nominal upper bound 40.0 C.",
    ),
    Anomaly(
        id="ccc333",
        field="signal_strength_db",
        timestamp="2024-01-01T06:20:00Z",
        value=-105.0,
        severity="medium",
        method="isolation_forest",
        detection_detail="Isolation Forest flagged this reading as anomalous (score: 0.62).",
    ),
]

_SESSION_ID = "test-insights-session"


def _seed_session(anomalies=_ANOMALIES, existing_insights=None):
    sessions.set_session(_SESSION_ID, {
        "dataframe": None,
        "anomalies": list(anomalies),
        "insights": existing_insights,
    })


def _call(request: InsightsRequest):
    return asyncio.run(post_insights(request))


def test_insights_contract_shape():
    _seed_session()
    response = _call(InsightsRequest(session_id=_SESSION_ID))
    assert isinstance(response, dict), f"Expected dict, got {type(response)}"
    assert "session_id" in response
    assert "mission_summary" in response
    assert "insights" in response
    assert response["session_id"] == _SESSION_ID
    assert isinstance(response["mission_summary"], str)
    assert len(response["mission_summary"]) > 0
    assert len(response["insights"]) == 3


def test_each_insight_fields_non_empty():
    _seed_session()
    response = _call(InsightsRequest(session_id=_SESSION_ID))
    for insight in response["insights"]:
        assert insight.get("explanation"), "explanation must not be empty"
        assert insight.get("root_cause_hypothesis"), "root_cause_hypothesis must not be empty"
        assert insight.get("recommendation"), "recommendation must not be empty"


def test_each_insight_source_chunks_and_no_strong_match():
    _seed_session()
    response = _call(InsightsRequest(session_id=_SESSION_ID))
    for insight in response["insights"]:
        assert insight["source_chunks"] == []
        assert insight["no_strong_match"] is True


def test_idempotency_cache_hit():
    _seed_session()
    import insights.generator as gen_module
    call_count = 0
    original = gen_module.generate_insights

    def counting_wrapper(anomalies):
        nonlocal call_count
        call_count += 1
        return original(anomalies)

    with patch.object(gen_module, "generate_insights", side_effect=counting_wrapper):
        resp1 = _call(InsightsRequest(session_id=_SESSION_ID))
        assert call_count == 1
        resp2 = _call(InsightsRequest(session_id=_SESSION_ID))
        assert call_count == 1

    assert resp1["mission_summary"] == resp2["mission_summary"]
    assert len(resp1["insights"]) == len(resp2["insights"])


def test_404_for_missing_session():
    from fastapi.responses import JSONResponse
    response = _call(InsightsRequest(session_id="nonexistent-xyz-999"))
    assert isinstance(response, JSONResponse)
    assert response.status_code == 404
    body = json.loads(response.body)
    assert body["error"]["code"] == "SESSION_NOT_FOUND"


def test_400_when_anomalies_not_present():
    from fastapi.responses import JSONResponse
    sessions.set_session("no-anomaly-session", {
        "dataframe": None,
        "anomalies": None,
        "insights": None,
    })
    response = _call(InsightsRequest(session_id="no-anomaly-session"))
    assert isinstance(response, JSONResponse)
    assert response.status_code == 400
    body = json.loads(response.body)
    assert body["error"]["code"] == "ANOMALIES_NOT_FOUND"
