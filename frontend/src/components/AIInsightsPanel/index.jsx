import { useState } from 'react';
import { generateInsights } from '../../api/insights';
import InsightCard from './InsightCard';
import MissionReport from '../MissionReport';

/**
 * AIInsightsPanel
 *
 * Props:
 *   sessionId  {string}   -- hex session ID.
 *   anomalies  {object[]} -- anomaly objects from the anomaly detection response.
 *                           Used to look up the matching anomaly for each InsightCard.
 */
export default function AIInsightsPanel({ sessionId, anomalies }) {
  const [status,   setStatus]   = useState('idle');
  const [response, setResponse] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const anomalyById = {};
  for (const anomaly of anomalies) {
    anomalyById[anomaly.id] = anomaly;
  }

  async function handleGenerate() {
    setStatus('loading');
    setErrorMsg('');
    try {
      const data = await generateInsights(sessionId);
      setResponse(data);
      setStatus('success');
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to generate insights. Please try again.';
      setErrorMsg(msg);
      setStatus('error');
    }
  }

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelHeading}>AI Insights</h2>
        <p style={styles.panelDesc}>
          Run the AI analysis engine to generate plain-language explanations,
          hypotheses, and recommended actions for each detected anomaly.
        </p>
      </div>

      <button
        type="button"
        style={{
          ...styles.generateButton,
          ...(isLoading ? styles.generateButtonDisabled : {}),
        }}
        disabled={isLoading}
        onClick={handleGenerate}
      >
        {isLoading ? 'Generating...' : 'Generate AI Insights'}
      </button>

      {status === 'error' && (
        <div style={styles.errorBanner}>
          {errorMsg}
        </div>
      )}

      {isSuccess && response && (
        <div style={styles.results}>
          <div style={styles.summaryBox}>
            <span style={styles.summaryLabel}>Mission Summary</span>
            <p style={styles.summaryText}>{response.mission_summary}</p>
          </div>

          <div style={styles.cardList}>
            {response.insights.map((insight) => {
              const anomaly = anomalyById[insight.anomaly_id];
              if (!anomaly) return null;
              return (
                <InsightCard
                  key={insight.anomaly_id}
                  insight={insight}
                  anomaly={anomaly}
                />
              );
            })}
          </div>
        </div>
      )}
      <MissionReport sessionId={sessionId} ready={isSuccess} />
    </div>
  );
}

const styles = {
  panel: {
    display:      'flex',
    flexDirection:'column',
    gap:          '16px',
    padding:      '20px',
    background:   '#fff',
    border:       '1px solid #e5e7eb',
    borderRadius: '10px',
    fontFamily:   '-apple-system, "Segoe UI", system-ui, sans-serif',
  },
  panelHeader: {
    display:      'flex',
    flexDirection:'column',
    gap:          '6px',
  },
  panelHeading: {
    margin:     0,
    fontSize:   '18px',
    fontWeight: 700,
    color:      '#1f2328',
  },
  panelDesc: {
    margin:     0,
    fontSize:   '13px',
    color:      '#57606a',
    lineHeight: 1.6,
  },
  generateButton: {
    padding:      '10px 22px',
    fontSize:     '14px',
    fontWeight:   600,
    color:        '#fff',
    background:   '#3b82d4',
    border:       'none',
    borderRadius: '8px',
    cursor:       'pointer',
    alignSelf:    'flex-start',
    transition:   'background 0.15s',
  },
  generateButtonDisabled: {
    background: '#9ca3af',
    cursor:     'not-allowed',
  },
  errorBanner: {
    background:   '#fef2f2',
    border:       '1px solid #fecaca',
    borderRadius: '6px',
    padding:      '10px 14px',
    fontSize:     '13px',
    color:        '#b91c1c',
  },
  results: {
    display:      'flex',
    flexDirection:'column',
    gap:          '16px',
  },
  summaryBox: {
    display:      'flex',
    flexDirection:'column',
    gap:          '6px',
    padding:      '14px 16px',
    background:   '#f7f8fa',
    border:       '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  summaryLabel: {
    fontSize:      '11px',
    fontWeight:    600,
    color:         '#57606a',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  summaryText: {
    margin:     0,
    fontSize:   '14px',
    color:      '#1f2328',
    lineHeight: 1.65,
  },
  cardList: {
    display:      'flex',
    flexDirection:'column',
    gap:          '12px',
  },
  reportRow: {
    borderTop:  '1px solid #e5e7eb',
    paddingTop: '14px',
  },
  reportButton: {
    padding:      '10px 22px',
    fontSize:     '14px',
    fontWeight:   600,
    color:        '#fff',
    background:   '#7c5cd8',
    border:       'none',
    borderRadius: '8px',
    cursor:       'pointer',
    transition:   'background 0.15s',
  },
  reportButtonDisabled: {
    background: '#9ca3af',
    cursor:     'not-allowed',
  },
};
