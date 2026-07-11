import { useBunchingAlerts } from './hooks/useBunchingAlerts';

export default function App() {
  const { incidents, connectionStatus } = useBunchingAlerts();

  // 1. Data Segregation
  const activeIncidents = incidents.filter(incident => incident.status === 'OPENED');
  const resolvedIncidents = incidents.filter(incident => incident.status === 'RESOLVED');

  // 2. Data Aggregation: Grouping active incidents by bus line
  const incidentsByLine = activeIncidents.reduce((accumulator, incident) => {
    if (!accumulator[incident.line]) {
      accumulator[incident.line] = [];
    }
    accumulator[incident.line].push(incident);
    return accumulator;
  }, {});

  // 3. Severity Sorting: Lines with the highest number of bunching pairs go to the top
  const sortedLinesBySeverity = Object.entries(incidentsByLine).sort(
    (a, b) => b[1].length - a[1].length
  );

  const isConnected = connectionStatus.includes('Connected');

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>SPTrans Telemetry</h1>
          <div style={styles.statusBadge(isConnected)}>
            <div style={styles.pulse(isConnected)}></div>
            {connectionStatus}
          </div>
        </div>
        <div style={styles.metricsContainer}>
          <div style={styles.metricBox}>
            <span style={styles.metricValue}>{activeIncidents.length}</span>
            <span style={styles.metricLabel}>Active Clusters</span>
          </div>
          <div style={styles.metricBox}>
            <span style={styles.metricValue}>{sortedLinesBySeverity.length}</span>
            <span style={styles.metricLabel}>Affected Lines</span>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <h2 style={styles.sectionTitle}>Priority Dispatch (Grouped by Line)</h2>

        {sortedLinesBySeverity.length === 0 ? (
          <div style={styles.emptyState}>Traffic is flowing optimally. No active bunching detected.</div>
        ) : (
          <div style={styles.grid}>
            {sortedLinesBySeverity.map(([lineId, lineIncidents]) => (
              <div key={lineId} style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.lineNumber}>Line {lineId}</h3>
                  <span style={styles.severityBadge(lineIncidents.length)}>
                    {lineIncidents.length} pairs
                  </span>
                </div>
                <div style={styles.cardBody}>
                  {lineIncidents.map(incident => (
                    <div key={incident.signature} style={styles.vehicleRow}>
                      <span style={styles.vehicleIcon}>🚌</span>
                      <span>{incident.signature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {resolvedIncidents.length > 0 && (
          <div style={styles.resolvedSection}>
            <h2 style={styles.sectionTitle}>Recently Resolved ({resolvedIncidents.length})</h2>
            <div style={styles.resolvedScroll}>
              {resolvedIncidents.map(incident => (
                <div key={incident.signature} style={styles.resolvedPill}>
                  ✅ Line {incident.line} ({incident.signature})
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Inline CSS-in-JS object to maintain zero-dependency portability
const styles = {
  container: {
    backgroundColor: '#0A0A0A',
    color: '#E0E0E0',
    minHeight: '100vh',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #222',
    paddingBottom: '1.5rem',
    marginBottom: '2rem',
  },
  title: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.5rem',
    fontWeight: '600',
    letterSpacing: '-0.02em',
  },
  statusBadge: (isConnected) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: isConnected ? '#062817' : '#2D1A00',
    color: isConnected ? '#10B981' : '#F59E0B',
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '0.875rem',
    fontWeight: '500',
  }),
  pulse: (isConnected) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: isConnected ? '#10B981' : '#F59E0B',
    boxShadow: `0 0 8px ${isConnected ? '#10B981' : '#F59E0B'}`,
  }),
  metricsContainer: {
    display: 'flex',
    gap: '1rem',
  },
  metricBox: {
    backgroundColor: '#141414',
    border: '1px solid #222',
    borderRadius: '8px',
    padding: '1rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '120px',
  },
  metricValue: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#EF4444',
  },
  metricLabel: {
    fontSize: '0.75rem',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '0.25rem',
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '500',
    color: '#A3A3A3',
    marginBottom: '1rem',
  },
  emptyState: {
    backgroundColor: '#141414',
    border: '1px dashed #333',
    borderRadius: '8px',
    padding: '3rem',
    textAlign: 'center',
    color: '#666',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1rem',
  },
  card: {
    backgroundColor: '#141414',
    border: '1px solid #222',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: '#1A1A1A',
    padding: '1rem',
    borderBottom: '1px solid #222',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineNumber: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#F9FAFB',
  },
  severityBadge: (count) => ({
    backgroundColor: count > 2 ? '#7F1D1D' : '#451A03',
    color: count > 2 ? '#FCA5A5' : '#FCD34D',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
  }),
  cardBody: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  vehicleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.875rem',
    color: '#D1D5DB',
    backgroundColor: '#1A1A1A',
    padding: '0.5rem 0.75rem',
    borderRadius: '4px',
  },
  vehicleIcon: {
    fontSize: '1rem',
  },
  resolvedSection: {
    marginTop: '3rem',
    borderTop: '1px solid #222',
    paddingTop: '2rem',
  },
  resolvedScroll: {
    display: 'flex',
    gap: '0.75rem',
    overflowX: 'auto',
    paddingBottom: '1rem',
  },
  resolvedPill: {
    flexShrink: 0,
    backgroundColor: '#062817',
    color: '#34D399',
    border: '1px solid #064E3B',
    padding: '0.5rem 1rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: '500',
  }
};