import { useBunchingAlerts } from './hooks/useBunchingAlerts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet markers not showing in React (Webpack/Vite issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for bunching alerts to make it look like an emergency
const alertIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function App() {
  const { sidebarIncidents = [], mapIncidents = [], connectionStatus = 'Disconnected' } = useBunchingAlerts() || {};

  const activeIncidents = sidebarIncidents;
  console.log(activeIncidents);
  const isConnected = connectionStatus.includes('Connected');

  // Aggregate active incidents by line for the sidebar
  const incidentsByLine = activeIncidents.reduce((accumulator, incident) => {
    if (!accumulator[incident.line]) {
      accumulator[incident.line] = [];
    }
    accumulator[incident.line].push(incident);
    return accumulator;
  }, {});

  const sortedLinesBySeverity = Object.entries(incidentsByLine).sort(
    (a, b) => b[1].length - a[1].length
  );

  // Center of São Paulo
  const mapCenter = [-23.5505, -46.6333];

  return (
    <div style={styles.dashboardContainer}>
      {/* Sidebar for Data Aggregation */}
      <aside style={styles.sidebar}>
        <div style={styles.header}>
          <h1 style={styles.title}>SPTrans Monitor</h1>
          <div style={styles.statusBadge(isConnected)}>
            <div style={styles.pulse(isConnected)}></div>
            {connectionStatus}
          </div>
        </div>

        <div style={styles.metricsRow}>
          <div style={styles.metricBox}>
            <span style={styles.metricValue}>{activeIncidents.length}</span>
            <span style={styles.metricLabel}>Active Clusters</span>
          </div>
        </div>

        <h2 style={styles.sectionTitle}>Priority Dispatch</h2>
        <div style={styles.listContainer}>
          {sortedLinesBySeverity.length === 0 ? (
            <div style={styles.emptyState}>No bunching detected.</div>
          ) : (
            sortedLinesBySeverity.map(([lineId, lineIncidents]) => (
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
                      <span>🚌 {incident.signature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Map Area */}
      <main style={styles.mapArea}>
        <MapContainer
          center={mapCenter}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mapIncidents.map((incident) => {
            // Ensure we only plot if coordinates are available
            if (!incident.location || !incident.location.lat) return null;

            return (
              <Marker
                key={incident.signature}
                position={[incident.location.lat, incident.location.lng]}
                icon={alertIcon}
              >
                <Popup>
                  <div style={{ textAlign: 'center' }}>
                    <strong style={{ fontSize: '1.2em', color: '#d32f2f' }}>
                      🚨 Line {incident.line}
                    </strong>
                    <br />
                    <span style={{ color: '#555' }}>Vehicles: {incident.signature}</span>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </main>
    </div>
  );
}

// Inline CSS-in-JS for zero-dependency portability
const styles = {
  dashboardContainer: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#0A0A0A',
    color: '#E0E0E0',
    fontFamily: 'Inter, system-ui, sans-serif',
    overflow: 'hidden',
  },
  sidebar: {
    width: '380px',
    minWidth: '380px',
    backgroundColor: '#121212',
    borderRight: '1px solid #222',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem',
    zIndex: 10,
    boxShadow: '4px 0 15px rgba(0,0,0,0.5)',
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.5rem',
    fontWeight: '600',
  },
  statusBadge: (isConnected) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: isConnected ? '#062817' : '#2D1A00',
    color: isConnected ? '#10B981' : '#F59E0B',
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: '500',
  }),
  pulse: (isConnected) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: isConnected ? '#10B981' : '#F59E0B',
    boxShadow: `0 0 8px ${isConnected ? '#10B981' : '#F59E0B'}`,
  }),
  metricsRow: {
    marginBottom: '1.5rem',
  },
  metricBox: {
    backgroundColor: '#1A1A1A',
    border: '1px solid #2A2A2A',
    borderRadius: '8px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#EF4444',
  },
  metricLabel: {
    fontSize: '0.75rem',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  sectionTitle: {
    fontSize: '1rem',
    color: '#A3A3A3',
    marginBottom: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    paddingRight: '0.5rem',
  },
  emptyState: {
    padding: '2rem',
    textAlign: 'center',
    color: '#666',
    border: '1px dashed #333',
    borderRadius: '8px',
  },
  card: {
    backgroundColor: '#1A1A1A',
    border: '1px solid #2A2A2A',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: '#222',
    padding: '0.75rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineNumber: {
    margin: 0,
    fontSize: '1rem',
    color: '#FFF',
  },
  severityBadge: (count) => ({
    backgroundColor: count > 2 ? '#7F1D1D' : '#451A03',
    color: count > 2 ? '#FCA5A5' : '#FCD34D',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
  }),
  cardBody: {
    padding: '0.75rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  vehicleRow: {
    fontSize: '0.875rem',
    color: '#CCC',
  },
  mapArea: {
    flex: 1,
    position: 'relative',
  }
};