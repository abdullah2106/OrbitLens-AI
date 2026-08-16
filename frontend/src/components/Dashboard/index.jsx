import { useEffect, useState } from 'react';
import { getTelemetry, getAnomalies } from '../../api/telemetry';
import HealthScore from './HealthScore';
import TelemetryChart from './TelemetryChart';
import SubsystemTable from './SubsystemTable';
import AIInsightsPanel from '../AIInsightsPanel';

/**
 * Numeric telemetry fields to chart -- hard-coded from NOMINAL_RANGES keys
 * (canonical source: backend/anomaly/nominal_ranges.py).
 */
const NUMERIC_FIELDS = [
  'battery_voltage',
  'temperature_c',
  'signal_strength_db',
  'solar_panel_efficiency_pct',
  'fuel_level_pct',
  'altitude_km',
  'velocity_kms',
];

/**
 * Dashboard
 *
 * Props:
 *   sessionId    {string} -- hex session ID returned by the upload endpoint.
 *   healthScore  {number} -- pre-computed by the upload endpoint (0-100).
 *   summaryStats {object} -- { row_count, fields, time_range } from upload response.
 *   onReset      {()=>void} -- callback to return to the UploadPanel.
 */
export default function Dashboard({ sessionId, healthScore, summaryStats, onReset }) {
  const [rows,              setRows]              = useState([]);
  const [anomalies,         setAnomalies]         = useState([]);
  const [loadingStatus,     setLoadingStatus]     = useState('loading');
  const [anomaliesStatus,   setAnomaliesStatus]   = useState('loading');
  const [error,             setError]             = useState(null);

  useEffect(() => {
    setLoadingStatus('loading');
    setAnomaliesStatus('loading');

    Promise.all([
      getTelemetry(sessionId),
      getAnomalies(sessionId),
    ])
      .then(([telemetryResult, anomaliesResult]) => {
        setRows(telemetryResult.rows);
        setLoadingStatus('success');

        setAnomalies(anomaliesResult.anomalies);
        setAnomaliesStatus('success');
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.error?.message ||
          err?.message ||
          'Failed to load mission data.';
        setError(msg);
        setLoadingStatus('error');
        setAnomaliesStatus('error');
      });
  }, [sessionId]);

  if (loadingStatus === 'loading') {
    return (
      <div style={styles.centred}>
        <span style={styles.spinner} aria-label="Loading telemetry" />
        <p style={styles.loadingText}>Loading telemetry data...</p>
      </div>
    );
  }

  if (loadingStatus === 'error') {
    return (
      <div style={styles.centred}>
        <p style={styles.errorText}>{error}</p>
        <button type="button" style={styles.resetButton} onClick={onReset}>
          Try again
        </button>
      </div>
    );
  }

  const anomaliesByField = {};
  for (const field of NUMERIC_FIELDS) {
    anomaliesByField[field] = [];
  }
  for (const anomaly of anomalies) {
    if (anomaliesByField[anomaly.field]) {
      anomaliesByField[anomaly.field].push(anomaly);
    }
  }

  const totalAnomalies = anomalies.length;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Mission Dashboard</h1>
          <p style={styles.sessionLine}>
            Session: <code style={styles.code}>{sessionId}</code>
          </p>
        </div>
        <button type="button" style={styles.resetButton} onClick={onReset}>
          &lt;- New Mission
        </button>
      </div>

      <div style={styles.statsRow}>
        <HealthScore healthScore={healthScore} />
        <div style={styles.statChip}>
          <span style={styles.statLabel}>Readings</span>
          <span style={styles.statValue}>{summaryStats.row_count}</span>
        </div>
        <div style={styles.statChip}>
          <span style={styles.statLabel}>Anomalies</span>
          <span style={{ ...styles.statValue, color: totalAnomalies > 0 ? '#b91c1c' : '#16a34a' }}>
            {anomaliesStatus === 'success' ? totalAnomalies : '...'}
          </span>
        </div>
        <div style={styles.statChip}>
          <span style={styles.statLabel}>Time range</span>
          <span style={styles.statValue}>
            {summaryStats.time_range.start.slice(11, 19)}
            {' -> '}
            {summaryStats.time_range.end.slice(11, 19)}
          </span>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        {NUMERIC_FIELDS.map((field) => (
          <div key={field} style={styles.chartCard}>
            <TelemetryChart
              field={field}
              rows={rows}
              anomalies={anomaliesByField[field]}
            />
          </div>
        ))}
      </div>

      <div style={styles.bottomRow}>
        <div style={styles.tableCard}>
          <SubsystemTable rows={rows} />
        </div>
      </div>

      {anomaliesStatus === 'success' && (
        <div style={styles.insightsPanelWrapper}>
          <AIInsightsPanel sessionId={sessionId} anomalies={anomalies} />
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    fontFamily: '-apple-system, "Segoe UI", system-ui, sans-serif',
    maxWidth:   '1100px',
    margin:     '0 auto',
    padding:    '24px 20px 48px',
    color:      '#1f2328',
  },
  centred: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '16px',
    minHeight:      '300px',
    fontFamily:     '-apple-system, "Segoe UI", system-ui, sans-serif',
  },
  spinner: {
    display:      'inline-block',
    width:        '36px',
    height:       '36px',
    border:       '4px solid #e5e7eb',
    borderTop:    '4px solid #3b82d4',
    borderRadius: '50%',
    animation:    'spin 0.8s linear infinite',
  },
  loadingText: {
    margin:   0,
    fontSize: '14px',
    color:    '#57606a',
  },
  errorText: {
    margin:       0,
    fontSize:     '14px',
    color:        '#b91c1c',
    background:   '#fef2f2',
    border:       '1px solid #fecaca',
    borderRadius: '6px',
    padding:      '8px 12px',
  },
  header: {
    display:        'flex',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    marginBottom:   '20px',
    flexWrap:       'wrap',
    gap:            '12px',
  },
  heading: {
    margin:     0,
    fontSize:   '22px',
    fontWeight: 700,
  },
  sessionLine: {
    margin:   '4px 0 0',
    fontSize: '13px',
    color:    '#57606a',
  },
  code: {
    fontSize:     '12px',
    background:   '#f7f8fa',
    border:       '1px solid #e5e7eb',
    borderRadius: '4px',
    padding:      '1px 5px',
  },
  statsRow: {
    display:       'flex',
    alignItems:    'center',
    gap:           '16px',
    flexWrap:      'wrap',
    marginBottom:  '24px',
    padding:       '14px 18px',
    background:    '#f7f8fa',
    borderRadius:  '10px',
    border:        '1px solid #e5e7eb',
  },
  statChip: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '2px',
  },
  statLabel: {
    fontSize:   '11px',
    color:      '#57606a',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  statValue: {
    fontSize:   '14px',
    fontWeight: 600,
    color:      '#1f2328',
  },
  chartsGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap:                 '16px',
    marginBottom:        '24px',
  },
  chartCard: {
    background:   '#fff',
    border:       '1px solid #e5e7eb',
    borderRadius: '10px',
    padding:      '14px 16px',
  },
  bottomRow: {
    display:             'grid',
    gridTemplateColumns: '1fr 1fr',
    gap:                 '16px',
  },
  tableCard: {
    background:   '#fff',
    border:       '1px solid #e5e7eb',
    borderRadius: '10px',
    padding:      '16px',
  },
  insightsPanelWrapper: {
    marginTop: '16px',
  },
  resetButton: {
    padding:      '7px 16px',
    fontSize:     '13px',
    fontWeight:   500,
    color:        '#57606a',
    background:   'transparent',
    border:       '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor:       'pointer',
  },
};
