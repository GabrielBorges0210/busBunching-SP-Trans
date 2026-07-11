import { useState, useEffect, useRef } from 'react';

export function useBunchingAlerts() {
    const [incidents, setIncidents] = useState({});
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
    const reconnectTimeoutRef = useRef(null);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:3000');

        socket.onopen = () => setConnectionStatus('Connected and listening...');
        socket.onclose = () => setConnectionStatus('Connection lost.');

        socket.onmessage = (event) => {
            const incomingData = JSON.parse(event.data);
            const { type, payload } = incomingData;

            if (type === 'SYNC_STATE') {
                // Rebuilding the dictionary from the array snapshot
                const initialState = {};
                payload.forEach((incident) => {
                    incident.status = incident.status || 'OPENED';
                    initialState[incident.signature] = incident;
                });

                setIncidents(initialState);
                return; // Early return to avoid running the single-event logic below
            }

            const incidentKey = payload.signature;
            setIncidents((previousIncidents) => {
                if (type === 'INCIDENT_RESOLVED') {
                    if (!previousIncidents[incidentKey]) return previousIncidents;

                    return {
                        ...previousIncidents,
                        [incidentKey]: {
                            ...previousIncidents[incidentKey],
                            status: 'RESOLVED',
                            lastUpdated: Date.now()
                        }
                    };
                }

                return {
                    ...previousIncidents,
                    [incidentKey]: {
                        ...payload,
                        status: 'OPENED',
                        lastUpdated: Date.now()
                    }
                };
            });
        };

        return () => socket.close();
    }, []);

    // Encapsulating the sorting logic inside the hook so the UI stays dumb
    const sortedIncidents = Object.values(incidents).sort((a, b) => b.lastUpdated - a.lastUpdated);

    return {
        incidents: sortedIncidents,
        connectionStatus
    };
}