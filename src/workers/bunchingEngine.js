import { connectToCache } from '../infrastructure/redisClient.js';
import { EventEmitter } from 'events';
import { connectToDatabase } from '../infrastructure/mongoClient.js';

export const engineEvents = new EventEmitter();

// Internal memory to manage the incident state machine
// Structure: { 'A-B': { line: '8000-10', lastSeenAt: 1690000000000, isNotified: true } }
const activeIncidentsRegistry = new Map();

engineEvents.on('incident_resolved', async (state) => {
    try {
        const db = await connectToDatabase();
        await db.collection('incidents').insertOne({
            ...state,
            resolvedAt: Date.now(),
            duration: Date.now() - state.lastSeenAt
        });
    } catch (err) {
        console.error('mongo_archive_failed', err);
    }
});

export async function startBunchingEngine() {
    try {
        const cache = await connectToCache();

        // Fetching all active spatial keys instantly via Registry Pattern
        const activeSpatialKeys = await cache.sMembers('system:active_lines');

        if (!activeSpatialKeys || activeSpatialKeys.length === 0) {
            console.log('idle_engine: no active lines to process.');
            scheduleNextRun();
            return;
        }

        const now = Date.now();
        const processedPairs = new Set(); // Memory for O(1) duplicate lookups

        for (const spatialKey of activeSpatialKeys) {
            // Fetch all buses inside this specific line and way
            const activeVehicles = await cache.zRange(spatialKey, 0, -1);

            if (activeVehicles.length < 2) continue; // Impossible to have a bunching with less than 2 buses

            for (const vehiclePrefix of activeVehicles) {

                let nearbyVehicles = [];
                try {
                    nearbyVehicles = await cache.geoSearch(spatialKey, vehiclePrefix, { radius: 300, unit: 'm' });
                } catch (err) {
                    if (err.message.includes('could not decode')) continue;
                    throw err;
                }

                for (const vehicle of nearbyVehicles) {
                    if (vehicle === vehiclePrefix) continue; // Ignora distância para si mesmo

                    const pairSignature = [vehiclePrefix, vehicle].sort().join('-');

                    if (processedPairs.has(pairSignature)) {
                        continue;
                    }

                    processedPairs.add(pairSignature);

                    const [vehicle1State, vehicle2State] = await Promise.all([
                        cache.get(`telemetry:vehicle:${vehiclePrefix}`),
                        cache.get(`telemetry:vehicle:${vehicle}`)
                    ]);

                    if (!vehicle1State || !vehicle2State) {
                        const ghostToEvict = !vehicle1State ? vehiclePrefix : vehicle;
                        await cache.zRem(spatialKey, ghostToEvict);
                        continue;
                    }

                    const v1Data = JSON.parse(vehicle1State);

                    const currentLineId = v1Data.lineId || v1Data.line || 'Desconhecida';

                    if (!activeIncidentsRegistry.has(pairSignature)) {
                        console.log(`alert_opened: Bunching detected on line ${currentLineId} between ${pairSignature}`);

                        const newIncident = {
                            line: currentLineId,
                            lastSeenAt: now,
                            isNotified: true,
                            signature: pairSignature,
                            location: {
                                lat: v1Data.latitude,
                                lng: v1Data.longitude
                            }
                        };

                        activeIncidentsRegistry.set(pairSignature, newIncident);
                        engineEvents.emit('incident_opened', newIncident);
                    } else {
                        const incidentState = activeIncidentsRegistry.get(pairSignature);
                        incidentState.lastSeenAt = now;
                        // Update the location so the map marker moves along with the buses
                        incidentState.location = {
                            lat: v1Data.latitude,
                            lng: v1Data.longitude
                        };

                        engineEvents.emit('incident_updated', incidentState);
                    }
                }
            }
        }

        const expirationThresholdMs = 3 * 60 * 1000; // 3 minutes grace period

        for (const [signature, state] of activeIncidentsRegistry.entries()) {
            const timeSinceLastSeen = now - state.lastSeenAt;

            if (timeSinceLastSeen > expirationThresholdMs) {
                console.log(`alert_resolved: Bunching dissipated on line ${state.line} between ${signature}`);

                // Bridging to the WebSocket Server
                engineEvents.emit('incident_resolved', state);
                activeIncidentsRegistry.delete(signature);
            }
        }

        scheduleNextRun();

    } catch (error) {
        console.error('engine_execution_failed', error.message);
        scheduleNextRun();
    }
}

function scheduleNextRun() {
    const engineIntervalMs = 10000; // 10 seconds
    setTimeout(startBunchingEngine, engineIntervalMs);
}

export function getActiveIncidents() {
    return Array.from(activeIncidentsRegistry.values());
}