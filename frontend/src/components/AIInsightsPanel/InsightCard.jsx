/**
 * InsightCard -- renders a single AI insight alongside its anomaly context.
 *
 * Props:
 *   insight  {object} -- { anomaly_id, explanation, root_cause_hypothesis,
 *                         recommendation, source_chunks, no_strong_match }
 *   anomaly  {object} -- { field, timestamp, severity, detection_detail }
 */
export default function InsightCard({ insight, anomaly }) {
  const severityStyles = {
    high:   { borderColor: '#ef4444', badgeBg: '#fef2f2', badgeColor: '#b91c1c' },
    medium: { borderColor: '#f59e0b', badgeBg: '#fffbeb', badgeColor: '#92400e' },
    low:    { borderColor: '#eab308', badgeBg: '#fefce8', badgeColor: '#713f12' },
  };
  const sv = severityStyles[anomaly.severity] || severityStyles.low;

  return (
    <div style={{ ...styles.card, borderLeftColor: sv.borderColor }}>

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.field}>{anomaly.field}</span>
          <span style={styles.timestamp}>at {anomaly.timestamp}</span>
        </div>
        <span
          style={{
            ...styles.badge,
            background: sv.badgeBg,
            color:      sv.badgeColor,
          }}
        >
          {anomaly.severity.toUpperCase()}
        </span>
      </div>

      {insight.no_strong_match && (
        <div style={styles.amberBanner}>
          No reference sources available -- explanation derived from telemetry data.
        </div>
      )}

      <p style={styles.paragraph}>{insight.explanation}</p>

      <div style={styles.section}>
        <span style={styles.sectionLabel}>Hypothesis</span>
        <p style={styles.paragraph}>{insight.root_cause_hypothesis}</p>
      </div>

      <div style={styles.section}>
        <span style={styles.sectionLabel}>Recommended Action</span>
        <p style={styles.paragraph}>{insight.recommendation}</p>
      </div>

      <details style={styles.details}>
        <summary style={styles.summary}>
          Sources ({insight.source_chunks.length})
        </summary>
        <div style={styles.sourcesBody}>
          {insight.source_chunks.length === 0 ? (
            <p style={styles.noSources}>
              No reference sources -- explanation derived from telemetry data only.
            </p>
          ) : (
            insight.source_chunks.map((chunk, i) => (
              <div key={i} style={styles.chunkItem}>
                <p style={styles.chunkDoc}>{chunk.source_doc}</p>
                <p style={styles.chunkText}>{chunk.chunk_text}</p>
                <span style={styles.chunkScore}>
                  {(chunk.similarity_score * 100).toFixed(0)}% match
                </span>
              </div>
            ))
          )}
        </div>
      </details>
    </div>
  );
}

const styles = {
  card: {
    borderLeft:   '4px solid #e5e7eb',
    background:   '#fff',
    border:       '1px solid #e5e7eb',
    borderRadius: '8px',
    padding:      '16px',
    display:      'flex',
    flexDirection:'column',
    gap:          '10px',
  },
  header: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    gap:            '8px',
    flexWrap:       'wrap',
  },
  headerLeft: {
    display:   'flex',
    flexWrap:  'wrap',
    gap:       '6px',
    alignItems:'center',
  },
  field: {
    fontSize:   '14px',
    fontWeight: 700,
    color:      '#1f2328',
    fontFamily: 'monospace',
  },
  timestamp: {
    fontSize: '12px',
    color:    '#57606a',
  },
  badge: {
    fontSize:     '11px',
    fontWeight:   700,
    padding:      '2px 8px',
    borderRadius: '12px',
    letterSpacing:'0.05em',
    whiteSpace:   'nowrap',
  },
  amberBanner: {
    background:   '#fffbeb',
    border:       '1px solid #fcd34d',
    borderRadius: '6px',
    padding:      '8px 12px',
    fontSize:     '13px',
    color:        '#92400e',
    fontWeight:   500,
  },
  paragraph: {
    margin:     0,
    fontSize:   '13px',
    color:      '#1f2328',
    lineHeight: 1.6,
  },
  section: {
    display:      'flex',
    flexDirection:'column',
    gap:          '4px',
  },
  sectionLabel: {
    fontSize:      '11px',
    fontWeight:    600,
    color:         '#57606a',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  details: {
    borderTop:  '1px solid #e5e7eb',
    paddingTop: '8px',
  },
  summary: {
    fontSize:   '13px',
    fontWeight: 600,
    color:      '#3b82d4',
    cursor:     'pointer',
  },
  sourcesBody: {
    marginTop: '10px',
    display:   'flex',
    flexDirection:'column',
    gap:       '10px',
  },
  noSources: {
    margin:   0,
    fontSize: '12px',
    color:    '#57606a',
    fontStyle:'italic',
  },
  chunkItem: {
    display:      'flex',
    flexDirection:'column',
    gap:          '4px',
    padding:      '8px 10px',
    background:   '#f7f8fa',
    borderRadius: '6px',
    border:       '1px solid #e5e7eb',
  },
  chunkDoc: {
    margin:     0,
    fontSize:   '12px',
    fontWeight: 700,
    color:      '#1f2328',
  },
  chunkText: {
    margin:     0,
    fontSize:   '12px',
    color:      '#374151',
    lineHeight: 1.5,
  },
  chunkScore: {
    fontSize:   '11px',
    color:      '#57606a',
    fontWeight: 500,
  },
};
