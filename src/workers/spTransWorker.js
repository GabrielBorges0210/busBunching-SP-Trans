import { fetchBusPositions } from '../infrastructure/spTransClient.js';
import { saveVehicleState } from '../infrastructure/redisClient.js';

export async function startWorker(currentDelayMs = 5000) {
    try {
        console.log('Fetching data from SPTrans...');
        const rawResponse = await fetchBusPositions();

        const parsedVehicles = [];

        for (const line of rawResponse.l) {
            for (const vehicleData of line.vs) {
                parsedVehicles.push({
                    lineId: line.cl.toString(),
                    lineOperationWay: line.sl,
                    vehiclePrefix: vehicleData.p.toString(),
                    locationTimestamp: vehicleData.ta,
                    latitude: vehicleData.py,
                    longitude: vehicleData.px
                });
            }
        }

        const cacheSavePromises = parsedVehicles.map(vehicle => saveVehicleState(vehicle));
        const results = await Promise.allSettled(cacheSavePromises);
        const failedSaves = results.filter(result => result.status === 'rejected');

        if (failedSaves.length > 0) {
            const errorReasons = failedSaves.map(failure => failure.reason.message);
            console.warn(`warning_cache_partial_failure: Failed to save ${failedSaves.length} vehicles. Reasons:`, errorReasons);
        }

        const successfulSavesCount = results.length - failedSaves.length;
        console.log(`success_cache_sync: Synchronized ${successfulSavesCount} vehicles into Redis memory.`);

        const defaultDelay = 5000;
        setTimeout(() => startWorker(defaultDelay), defaultDelay);

    } catch (error) {
        console.error('API failed. Error:', error.message);

        const isAuthError = error.message.includes('authentication') || error.message.includes('cookie_missing');

        const maxBackoffMs = 60000;
        const nextDelayMs = Math.min(currentDelayMs * 2, maxBackoffMs);

        setTimeout(() => startWorker(nextDelayMs), nextDelayMs);
    }
}