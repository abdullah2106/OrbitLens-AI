import { useRef, useState } from 'react';
import { loadSample, uploadCSV } from '../../api/telemetry';

/**
 * UploadPanel -- CSV upload UI.
 *
 * Props:
 *   onSuccess({ sessionId, healthScore, summaryStats }) -- called after a
 *   successful upload or sample load.
 */
export default function UploadPanel({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function clearError() {
    setError(null);
  }

  function extractError(err) {
    return (
      err?.response?.data?.error?.message ||
      err?.message ||
      'An unexpected error occurred.'
    );
  }

  async function handleData(promise) {
    setLoading(true);
    clearError();
    try {
      const data = await promise;
      onSuccess({
        sessionId:    data.session_id,
        healthScore:  data.health_score,
        summaryStats: data.summary_stats,
      });
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (file) handleData(uploadCSV(file));
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleData(uploadCSV(file));
  }

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.heading}>OrbitLens AI</h1>
      <p style={styles.subheading}>Upload a telemetry CSV to begin mission analysis.</p>

      <div
        style={{
          ...styles.dropZone,
          ...(dragging ? styles.dropZoneDragging : {}),
          ...(loading  ? styles.dropZoneDisabled : {}),
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Drop CSV file here or click to browse"
        onKeyDown={(e) => e.key === 'Enter' && !loading && inputRef.current?.click()}
      >
        {loading ? (
          <span style={styles.spinner} aria-label="Loading" />
        ) : (
          <>
            <span style={styles.dropIcon}>[folder]</span>
            <p style={styles.dropText}>
              {dragging ? 'Release to upload' : 'Drag & drop a CSV here'}
            </p>
            <p style={styles.dropHint}>or click to browse</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />

      <button
        type="button"
        style={styles.sampleButton}
        onClick={() => handleData(loadSample())}
        disabled={loading}
      >
        Try Sample Mission
      </button>

      {error && (
        <p role="alert" style={styles.errorText}>
          {error}
        </p>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            '16px',
    padding:        '40px 24px',
    maxWidth:       '480px',
    margin:         '0 auto',
    fontFamily:     '-apple-system, "Segoe UI", system-ui, sans-serif',
  },
  heading: {
    margin:     0,
    fontSize:   '28px',
    fontWeight: 700,
    color:      '#1f2328',
  },
  subheading: {
    margin:     0,
    fontSize:   '15px',
    color:      '#57606a',
    textAlign:  'center',
  },
  dropZone: {
    width:           '100%',
    minHeight:       '160px',
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             '8px',
    border:          '2px dashed #e5e7eb',
    borderRadius:    '12px',
    background:      '#f7f8fa',
    cursor:          'pointer',
    transition:      'border-color 0.15s, background 0.15s',
    userSelect:      'none',
  },
  dropZoneDragging: {
    borderColor: '#3b82d4',
    background:  '#eff6ff',
  },
  dropZoneDisabled: {
    cursor:  'default',
    opacity: 0.7,
  },
  dropIcon: {
    fontSize: '36px',
  },
  dropText: {
    margin:     0,
    fontSize:   '15px',
    color:      '#1f2328',
    fontWeight: 500,
  },
  dropHint: {
    margin:   0,
    fontSize: '13px',
    color:    '#57606a',
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
  sampleButton: {
    padding:        '10px 24px',
    fontSize:       '14px',
    fontWeight:     500,
    color:          '#3b82d4',
    background:     'transparent',
    border:         '1px solid #3b82d4',
    borderRadius:   '8px',
    cursor:         'pointer',
    transition:     'background 0.15s',
  },
  errorText: {
    margin:     0,
    fontSize:   '14px',
    color:      '#b91c1c',
    background: '#fef2f2',
    border:     '1px solid #fecaca',
    borderRadius: '6px',
    padding:    '8px 12px',
    width:      '100%',
    boxSizing:  'border-box',
  },
};
