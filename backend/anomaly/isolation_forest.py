"""
Isolation Forest anomaly detector for telemetry data.

Algorithm:
  1. Extract numeric columns (keys of NOMINAL_RANGES); scale with StandardScaler.
  2. Fit IsolationForest with a fixed contamination estimate (no knowledge of
     ground truth — this detector must generalize to any telemetry file, not
     just the bundled sample data).
  3. Among flagged rows, sort by raw anomaly score (most negative = worst).
     Assign severity by score tercile: bottom third -> "high"; middle -> "medium"; top -> "low".
  4. Return list[Anomaly] with method="isolation_forest".

Design note: contamination is a FIXED constant (CONTAMINATION_ESTIMATE), not
derived from any ground-truth file. Reading expected anomaly locations from a
ground-truth file to set this parameter would make the detector circular --
it would stop being an independent, unsupervised check and instead just
re-derive an already-known answer. A fixed estimate keeps this detector
honest and usable on data with no ground truth at all.
"""

from uuid import uuid4

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from anomaly.models import Anomaly
from anomaly.nominal_ranges import NOMINAL_RANGES

# Fixed assumption: roughly 5% of rows in a typical telemetry file may be
# anomalous. This is a general-purpose default, not tuned to any one dataset.
CONTAMINATION_ESTIMATE = 0.05


def detect(df: pd.DataFrame) -> list[Anomaly]:
    """
    Run Isolation Forest anomaly detection on *df* and return a list of Anomaly objects.

    *df* must have a 'timestamp' column (pd.Timestamp) and numeric columns matching
    the keys of NOMINAL_RANGES.
    """
    # -- Feature extraction ------------------------------------------------
    numeric_fields = [f for f in NOMINAL_RANGES if f in df.columns]
    if not numeric_fields:
        return []

    n_fields = len(numeric_fields)
    X = df[numeric_fields].astype(float).values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # -- Model fit + predict ------------------------------------------------
    clf = IsolationForest(contamination=CONTAMINATION_ESTIMATE, random_state=42)
    clf.fit(X_scaled)

    labels = clf.predict(X_scaled)            # -1 = anomaly, +1 = normal
    raw_scores = clf.score_samples(X_scaled)   # more negative = more anomalous

    flagged_indices = np.where(labels == -1)[0]
    if len(flagged_indices) == 0:
        return []

    flagged_scores = raw_scores[flagged_indices]

    # Sort so most negative (worst) is first for tercile assignment
    sort_order = np.argsort(flagged_scores)            # ascending (worst first)
    sorted_flagged = flagged_indices[sort_order]
    sorted_scores = flagged_scores[sort_order]

    n_flagged = len(sorted_flagged)
    tercile = n_flagged / 3.0

    def _severity(rank: int) -> str:
        if rank < tercile:
            return "high"
        if rank < 2 * tercile:
            return "medium"
        return "low"

    # -- Build Anomaly objects ----------------------------------------------
    anomalies: list[Anomaly] = []
    for rank, (df_idx, score) in enumerate(zip(sorted_flagged, sorted_scores)):
        ts = df["timestamp"].iloc[df_idx]
        timestamp = ts.strftime("%Y-%m-%dT%H:%M:%SZ")
        severity = _severity(rank)

        # Use the field with the largest scaled deviation as the representative field
        row_scaled = X_scaled[df_idx]
        dominant_field_pos = int(np.argmax(np.abs(row_scaled)))
        field = numeric_fields[dominant_field_pos]
        value = float(X[df_idx, dominant_field_pos])

        detection_detail = (
            f"Isolation Forest score: {score:.3f}; "
            f"multivariate anomaly across {n_fields} fields"
        )

        anomalies.append(Anomaly(
            id=uuid4().hex,
            field=field,
            timestamp=timestamp,
            value=value,
            severity=severity,
            method="isolation_forest",
            detection_detail=detection_detail,
        ))

    return anomalies
