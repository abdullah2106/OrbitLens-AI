import { downloadReport } from '../../api/report';

/**
 * MissionReport -- download card offering both report formats.
 *
 * The backend always generates Markdown; PDF is attempted server-side and
 * silently falls back to Markdown if WeasyPrint/system libraries are
 * unavailable (see backend/api/routes_report.py). Both buttons are always
 * shown -- if PDF generation fails server-side, the browser will simply
 * receive a .md file instead, which is a safe, non-breaking fallback rather
 * than a visible error.
 *
 * Props:
 *   sessionId {string}  -- hex session ID.
 *   ready     {boolean} -- true once insights have been generated for this
 *                          session (report requires insights to exist server-side).
 */
export default function MissionReport({ sessionId, ready }) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.label}>Mission Report</span>
        <p style={styles.desc}>
          Download a full report with health score, detected anomalies, and
          AI-generated explanations.
        </p>
      </div>
      <div style={styles.buttonRow}>
        <button
          type="button"
          style={{ ...styles.button, ...(!ready ? styles.buttonDisabled : {}) }}
          disabled={!ready}
          onClick={() => downloadReport(sessionId, 'markdown')}
        >
          Download Markdown
        </button>
        <button
          type="button"
          style={{ ...styles.button, ...styles.buttonSecondary, ...(!ready ? styles.buttonDisabled : {}) }}
          disabled={!ready}
          onClick={() => downloadReport(sessionId, 'pdf')}
        >
          Download PDF
        </button>
      </div>
      {!ready && (
        <p style={styles.hint}>Generate AI insights first to enable report download.</p>
      )}
    </div>
  );
}

const styles = {
  card: {
    display:      'flex',
    flexDirection:'column',
    gap:          '10px',
    padding:      '16px',
    background:   '#f7f8fa',
    border:       '1px solid #e5e7eb',
    borderRadius: '10px',
    fontFamily:   '-apple-system, "Segoe UI", system-ui, sans-serif',
  },
  header: {
    display:      'flex',
    flexDirection:'column',
    gap:          '4px',
  },
  label: {
    fontSize:   '13px',
    fontWeight: 700,
    color:      '#1f2328',
  },
  desc: {
    margin:     0,
    fontSize:   '12px',
    color:      '#57606a',
    lineHeight: 1.5,
  },
  buttonRow: {
    display: 'flex',
    gap:     '10px',
  },
  button: {
    padding:      '8px 16px',
    fontSize:     '13px',
    fontWeight:   600,
    color:        '#fff',
    background:   '#7c5cd8',
    border:       'none',
    borderRadius: '8px',
    cursor:       'pointer',
  },
  buttonSecondary: {
    background: '#3b82d4',
  },
  buttonDisabled: {
    background: '#9ca3af',
    cursor:     'not-allowed',
  },
  hint: {
    margin:    0,
    fontSize:  '12px',
    color:     '#57606a',
    fontStyle: 'italic',
  },
};
