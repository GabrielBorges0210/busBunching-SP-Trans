import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { startWorker } from './workers/spTransWorker.js';
import { startBunchingEngine, engineEvents, getActiveIncidents } from './workers/bunchingEngine.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket Connection Lifecycle
wss.on('connection', (ws) => {
    console.log('client_connected: New WebSocket connection established.');

    const currentIncidents = getActiveIncidents();

    ws.send(JSON.stringify({
        type: 'SYNC_STATE',
        payload: currentIncidents
    }));

    ws.on('close', () => {
        console.log('client_disconnected: WebSocket connection closed.');
    });
});

// The Bridge: Listening to the Engine and broadcasting to all WebSocket clients
engineEvents.on('incident_opened', (incidentData) => {
    broadcast({ type: 'INCIDENT_OPENED', payload: incidentData });
});

engineEvents.on('incident_updated', (incident) => {
    broadcast({ type: 'INCIDENT_UPDATED', payload: incident });
});

engineEvents.on('incident_resolved', (incidentData) => {
    broadcast({ type: 'INCIDENT_RESOLVED', payload: incidentData });
});

function broadcast(message) {
    const serializedMessage = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // 1 means OPEN
            client.send(serializedMessage);
        }
    });
}

// Bootstrapping the Application
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`server_started: Listening on port ${PORT}`);

    // Kickstarting the background daemons
    startWorker();
    startBunchingEngine();
});