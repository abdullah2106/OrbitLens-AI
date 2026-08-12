"""
Statistical anomaly detector for telemetry data.

Algorithm (per field in NOMINAL_RANGES):
  1. A row is only flagged if the value is OUTSIDE the field's nominal range.
     Being statistically unusual (far from the rolling mean) is NOT enough on
     its own — routine noise inside the nominal band must never be flagged.
  2. For flagged rows, compute severity from TWO signals and take the higher:
       a) Nominal-range excess: how far outside the range, as a fraction of
          range width.
            > 25% -> "high"; 10-25% -> "medium"; <= 10% -> "low"
       b) Rolling z-score (window=20 rows): confirms how statistically extreme
          the point is relative to recent history.
            > 4.0 std -> "high"; 2.5-4.0 -> "medium"; <= 2.5 -> "low"
"""

from uuid import uuid4

import pandas as pd

from anomaly.models import Anomaly, SEVERITY_ORDER
from anomaly.nominal_ranges import NOMINAL_RANGES


def _std_severity(z: float) -> str:
    az = abs(z)
    if az > 4.0:
        return "high"
    if az > 2.5:
        return "medium"
    return "low"


def _nominal_severity(value: float, lo: float, hi: float) -> str | None:
    """
    Return severity based on how far outside the nominal range the value is,
    expressed as a fraction of the range width. Returns None if value is
    inside [lo, hi] — i.e. not an anomaly at all under this detector.
    """
    range_width = hi - lo
    if range_width == 0:
        return None
    if lo <= value <= hi:
        return None
    nearest_bound = lo if value < lo else hi
    excess = abs(value - nearest_bound) / range_width
    if excess > 0.25:
        return "high"
    if excess > 0.10:
        return "medium"
    return "low"


def _max_severity(a: str, b: str) -> str:
    return a if SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] else b


def detect(df: pd.DataFrame) -> list[Anomaly]:
    """
    Run statistical anomaly detection on *df* and return a list of Anomaly objects.

    *df* must have a 'timestamp' column (pd.Timestamp) and numeric columns matching
    the keys of NOMINAL_RANGES.

    A row is only ever flagged if it falls outside the field's nominal range.
    The rolling z-score is used purely to refine severity, never to trigger
    a flag by itself — this is the deliberate fix over the original design,
    which flagged on statistical deviation alone and produced heavy false
    positives from routine noise inside the nominal band.
    """
    anomalies: list[Anomaly] = []

    for field, (lo, hi) in NOMINAL_RANGES.items():
        if field not in df.columns:
            continue

        series = df[field].astype(float)
        rolling = series.rolling(window=20, min_periods=1)
        mean_s = rolling.mean()
        std_s = rolling.std(ddof=0).fillna(0)

        for idx in series.index:
            value = series.loc[idx]

            # ── Gate: must be outside nominal range to be flagged at all ──
            sev_nom = _nominal_severity(value, lo, hi)
            if sev_nom is None:
                continue

            mean = mean_s.loc[idx]
            std = std_s.loc[idx]
            z = (value - mean) / std if std > 0 else 0.0

            sev_std = _std_severity(z) if std > 0 else "low"
            severity = _max_severity(sev_nom, sev_std)

            direction = "above" if value > mean else "below"
            detection_detail = (
                f"{direction} {abs(z):.1f} std from rolling mean "
                f"(mean={mean:.2f}, std={std:.2f}); nominal {lo}-{hi}"
            )

            ts = df["timestamp"].loc[idx]
            timestamp = ts.strftime("%Y-%m-%dT%H:%M:%SZ")

            anomalies.append(Anomaly(
                id=uuid4().hex,
                field=field,
                timestamp=timestamp,
                value=float(value),
                severity=severity,
                method="statistical",
                detection_detail=detection_detail,
            ))

    return anomalies
