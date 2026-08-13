"""
Insight generator -- pure-Python string-template implementation.

Function signature is frozen (see Implementation Notes / Insights Integration Boundary).
A future RAG/Granite implementation replaces only this file; everything else stays the same.
"""

from anomaly.models import Anomaly, SEVERITY_ORDER

# ---------------------------------------------------------------------------
# Per-field, per-severity templates
# Each entry: (explanation_fn, root_cause, recommendation)
# explanation_fn is called with the anomaly object and returns a str.
# root_cause and recommendation are plain strings.
# ---------------------------------------------------------------------------

_URGENCY = {
    "low": "minor deviation",
    "medium": "significant deviation",
    "high": "critical deviation",
}

_TEMPLATES: dict[tuple[str, str], tuple] = {

    # -- battery_voltage --------------------------------------------------
    ("battery_voltage", "high"): (
        lambda a: (
            f"Battery voltage dropped to {a.value:.1f} V at {a.timestamp}, well below the "
            f"nominal range of 26-32 V. {a.detection_detail}."
        ),
        "Possible causes include a battery cell failure, excessive load draw from an onboard "
        "subsystem, or a charging circuit fault.",
        "Immediately reduce non-essential power loads and verify solar charging input. "
        "Schedule a battery capacity test on the next ground contact.",
    ),
    ("battery_voltage", "medium"): (
        lambda a: (
            f"Battery voltage recorded a significant deviation to {a.value:.1f} V at "
            f"{a.timestamp} (nominal 26-32 V). {a.detection_detail}."
        ),
        "Likely causes include increased power draw from a payload subsystem, partial "
        "shadowing of the solar panels, or early-stage cell degradation.",
        "Monitor battery voltage trend over the next two orbits. Reduce discretionary "
        "payload power if the downward trend continues.",
    ),
    ("battery_voltage", "low"): (
        lambda a: (
            f"Battery voltage showed a minor deviation to {a.value:.1f} V at {a.timestamp} "
            f"(nominal 26-32 V). {a.detection_detail}."
        ),
        "Likely a transient load spike or minor solar input fluctuation. No immediate "
        "hardware fault indicated.",
        "Continue nominal operations. Log the event and review the battery trend at the "
        "next scheduled contact.",
    ),

    # -- temperature_c ------------------------------------------------------
    ("temperature_c", "high"): (
        lambda a: (
            f"A critical thermal spike to {a.value:.1f} C was detected at {a.timestamp}, "
            f"well outside the nominal range of 10-40 C. {a.detection_detail}."
        ),
        "Possible causes include a thermal control system failure, extended sun-side "
        "orientation, or a malfunctioning heater element stuck in the on-state.",
        "Verify attitude control to ensure nominal sun-pointing. Check thermal control "
        "system heater commands and inspect temperature trend on adjacent sensors.",
    ),
    ("temperature_c", "medium"): (
        lambda a: (
            f"Onboard temperature reached a significant deviation of {a.value:.1f} C at "
            f"{a.timestamp} (nominal 10-40 C). {a.detection_detail}."
        ),
        "Elevated temperatures may indicate reduced radiator efficiency, a partial shade "
        "loss event, or an increase in internal dissipation from active payloads.",
        "Review payload activity schedule and confirm the thermal control loop is "
        "responding. Increase monitoring frequency for the next two orbits.",
    ),
    ("temperature_c", "low"): (
        lambda a: (
            f"Temperature registered a minor deviation to {a.value:.1f} C at {a.timestamp} "
            f"(nominal 10-40 C). {a.detection_detail}."
        ),
        "Likely a brief attitude manoeuvre exposing a sensor to slightly different solar "
        "flux, or a transient heater cycle.",
        "No immediate action required. Continue nominal monitoring.",
    ),

    # -- signal_strength_db --------------------------------------------------
    ("signal_strength_db", "high"): (
        lambda a: (
            f"A critical communications dropout was detected -- signal strength fell to "
            f"{a.value:.1f} dB at {a.timestamp} (nominal -90 to -60 dB). {a.detection_detail}."
        ),
        "Possible causes include antenna pointing loss, a ground-station obstruction, "
        "ionospheric scintillation, or an onboard RF hardware fault.",
        "Attempt re-acquisition on the backup antenna if available. Verify ground station "
        "elevation mask and check onboard transmitter power and antenna health.",
    ),
    ("signal_strength_db", "medium"): (
        lambda a: (
            f"Signal strength dropped significantly to {a.value:.1f} dB at {a.timestamp} "
            f"(nominal -90 to -60 dB). {a.detection_detail}."
        ),
        "Degraded link margin may result from atmospheric interference, marginal antenna "
        "pointing, or interference from a co-located transmitter.",
        "Review antenna pointing accuracy and check for scheduled events that may cause "
        "link margin reduction. Confirm ground station receiver noise floor.",
    ),
    ("signal_strength_db", "low"): (
        lambda a: (
            f"Signal strength showed a minor deviation to {a.value:.1f} dB at {a.timestamp} "
            f"(nominal -90 to -60 dB). {a.detection_detail}."
        ),
        "Likely a brief atmospheric attenuation event or minor antenna gimbal excursion.",
        "No immediate action required. Monitor signal trend at next pass.",
    ),

    # -- solar_panel_efficiency_pct ------------------------------------------
    ("solar_panel_efficiency_pct", "high"): (
        lambda a: (
            f"Solar panel efficiency critically degraded to {a.value:.1f}% at {a.timestamp} "
            f"(nominal 70-100%). {a.detection_detail}."
        ),
        "Possible causes include physical damage to panel cells, significant debris impact, "
        "or a deployment mechanism failure leaving panels in a sub-optimal position.",
        "Switch to battery-conserving safe mode. Attempt panel reorientation commands and "
        "inspect panel telemetry for signs of partial failure.",
    ),
    ("solar_panel_efficiency_pct", "medium"): (
        lambda a: (
            f"Solar panel efficiency dropped significantly to {a.value:.1f}% at {a.timestamp} "
            f"(nominal 70-100%). {a.detection_detail}."
        ),
        "Extended eclipse periods, surface contamination, or early-stage cell degradation "
        "from radiation exposure may be contributing factors.",
        "Review power budget margins and reduce discretionary loads. Log cumulative "
        "degradation trend for comparison against pre-launch baseline.",
    ),
    ("solar_panel_efficiency_pct", "low"): (
        lambda a: (
            f"Solar panel efficiency registered a minor deviation to {a.value:.1f}% at "
            f"{a.timestamp} (nominal 70-100%). {a.detection_detail}."
        ),
        "Likely transient shadowing from structure or minor pointing offset.",
        "Monitor over the next orbit. No immediate action required.",
    ),

    # -- fuel_level_pct -------------------------------------------------------
    ("fuel_level_pct", "high"): (
        lambda a: (
            f"Fuel level critically anomalous at {a.value:.1f}% at {a.timestamp} "
            f"(nominal 0-100%). {a.detection_detail}."
        ),
        "An unexpected rapid fuel consumption spike could indicate a thruster leak, "
        "an uncommanded firing event, or a fuel gauge sensor fault.",
        "Immediately inhibit thruster firing and cross-check fuel flow telemetry. Assess "
        "mission delta-v margin and alert ground operations team.",
    ),
    ("fuel_level_pct", "medium"): (
        lambda a: (
            f"Fuel level deviated significantly to {a.value:.1f}% at {a.timestamp}. "
            f"{a.detection_detail}."
        ),
        "Higher-than-expected fuel usage may be caused by increased attitude control "
        "corrections or an unplanned manoeuvre execution.",
        "Review recent manoeuvre logs and thruster firing history. Update the fuel "
        "budget model and verify remaining delta-v margin.",
    ),
    ("fuel_level_pct", "low"): (
        lambda a: (
            f"Fuel level showed a minor deviation to {a.value:.1f}% at {a.timestamp}. "
            f"{a.detection_detail}."
        ),
        "Likely a normal attitude maintenance burn slightly larger than modelled.",
        "Log the event and reconcile against the planned fuel budget at the next contact.",
    ),

    # -- altitude_km ------------------------------------------------------
    ("altitude_km", "high"): (
        lambda a: (
            f"Altitude critically outside the nominal orbital band at {a.value:.1f} km "
            f"at {a.timestamp} (nominal 400-420 km). {a.detection_detail}."
        ),
        "Possible causes include an unexpected drag event in a denser atmospheric layer, "
        "a mis-executed orbit-raising manoeuvre, or an attitude fault affecting drag profile.",
        "Execute corrective manoeuvre at the next available burn window. Verify propulsion "
        "and guidance systems are nominal before commanding the burn.",
    ),
    ("altitude_km", "medium"): (
        lambda a: (
            f"Altitude deviated significantly to {a.value:.1f} km at {a.timestamp} "
            f"(nominal 400-420 km). {a.detection_detail}."
        ),
        "Natural orbital decay, a slightly over- or under-performed manoeuvre, or "
        "atmospheric density variations at solar maximum may be responsible.",
        "Review orbit determination solution and schedule a station-keeping burn if "
        "the altitude trend continues outside the dead-band.",
    ),
    ("altitude_km", "low"): (
        lambda a: (
            f"Altitude registered a minor deviation to {a.value:.1f} km at {a.timestamp} "
            f"(nominal 400-420 km). {a.detection_detail}."
        ),
        "Within the normal station-keeping dead-band. Likely natural drift.",
        "No immediate action required. Monitor altitude trend over the next orbit.",
    ),

    # -- velocity_kms ---------------------------------------------------------
    ("velocity_kms", "high"): (
        lambda a: (
            f"Orbital velocity critically anomalous at {a.value:.3f} km/s at {a.timestamp} "
            f"(nominal 7.6-7.7 km/s). {a.detection_detail}."
        ),
        "A large velocity deviation could result from an uncommanded thruster firing, "
        "an orbit determination error, or a navigation system fault.",
        "Cross-check with independent range and Doppler tracking. Suspend planned "
        "manoeuvres until the navigation solution is confirmed.",
    ),
    ("velocity_kms", "medium"): (
        lambda a: (
            f"Orbital velocity showed a significant deviation to {a.value:.3f} km/s at "
            f"{a.timestamp} (nominal 7.6-7.7 km/s). {a.detection_detail}."
        ),
        "May reflect a slight orbit eccentricity growth or a partially executed burn.",
        "Review recent manoeuvre telemetry and update the orbital elements. Verify "
        "the navigation filter convergence.",
    ),
    ("velocity_kms", "low"): (
        lambda a: (
            f"Orbital velocity registered a minor deviation to {a.value:.3f} km/s at "
            f"{a.timestamp} (nominal 7.6-7.7 km/s). {a.detection_detail}."
        ),
        "Likely a normal variation due to orbital eccentricity near perigee/apogee.",
        "No action required. Routine monitoring is sufficient.",
    ),
}


def _fallback_explanation(a: Anomaly) -> str:
    urgency = _URGENCY.get(a.severity, "deviation")
    return (
        f"{a.field.replace('_', ' ').title()} recorded a {urgency} of {a.value} "
        f"at {a.timestamp}. {a.detection_detail}."
    )


def _fallback_root_cause(a: Anomaly) -> str:
    return (
        f"The root cause of this {a.severity}-severity {a.field.replace('_', ' ')} anomaly "
        f"requires further investigation via subsystem telemetry review."
    )


def _fallback_recommendation(a: Anomaly) -> str:
    return (
        f"Review {a.field.replace('_', ' ')} subsystem logs and consult with the mission "
        f"operations team to determine whether corrective action is required."
    )


def generate_insights(anomalies: list[Anomaly]) -> dict:
    """
    Returns a dict with keys:
      mission_summary: str
      insights: list[dict]  -- each dict matches the /insights Canonical API Contract
    Must not raise. Wrap all errors internally and return a safe fallback dict.
    source_chunks may be [] and no_strong_match may be True if no retrieval is performed.
    """
    try:
        # -- Per-anomaly insight generation -----------------------------------
        insights = []
        for anomaly in anomalies:
            key = (anomaly.field, anomaly.severity)
            template = _TEMPLATES.get(key)

            if template is not None:
                explanation_fn, root_cause, recommendation = template
                explanation = explanation_fn(anomaly)
            else:
                explanation = _fallback_explanation(anomaly)
                root_cause = _fallback_root_cause(anomaly)
                recommendation = _fallback_recommendation(anomaly)

            insights.append({
                "anomaly_id": anomaly.id,
                "explanation": explanation,
                "root_cause_hypothesis": root_cause,
                "recommendation": recommendation,
                "source_chunks": [],
                "no_strong_match": True,
            })

        # -- Mission summary ---------------------------------------------------
        total = len(anomalies)
        high = sum(1 for a in anomalies if a.severity == "high")
        medium = sum(1 for a in anomalies if a.severity == "medium")
        low = sum(1 for a in anomalies if a.severity == "low")

        if total == 0:
            mission_summary = "Mission analysis found no anomalies. All systems nominal."
        else:
            top = max(anomalies, key=lambda a: SEVERITY_ORDER[a.severity])
            ts_display = top.timestamp
            try:
                ts_display = top.timestamp.split("T")[1].rstrip("Z")[:5] + " UTC"
            except Exception:
                pass
            field_display = top.field.replace("_", " ")
            summary_sentence = (
                f"The most critical event was a {field_display} anomaly at {ts_display}"
            )
            mission_summary = (
                f"Mission analysis identified {total} anomalies: {high} high, "
                f"{medium} medium, {low} low severity. {summary_sentence}."
            )

        return {
            "mission_summary": mission_summary,
            "insights": insights,
        }

    except Exception as exc:  # noqa: BLE001
        return {
            "mission_summary": "Insight generation encountered an error. Please retry.",
            "insights": [],
            "_error": str(exc),
        }
