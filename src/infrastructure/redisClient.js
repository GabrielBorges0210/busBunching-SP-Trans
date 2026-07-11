import { createClient } from 'redis';

let activeCacheClient = null;

export async function connectToCache() {
    if (activeCacheClient) {
        return activeCacheClient;
    }

    const cacheUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    console.log("Creating cache client");
    activeCacheClient = createClient({ url: cacheUrl });

    activeCacheClient.on('error', (error) => {
        console.error('cache_connection_failed', error.message);
    });

    await activeCacheClient.connect();
    return activeCacheClient;
}

export async function saveVehicleState(vehicleData) {
    const cache = await connectToCache();

    // EX: 60 ensures the data self-destructs after 60 seconds.
    const detailKey = `telemetry:vehicle:${vehicleData.vehiclePrefix}`;
    const saveDetailPromise = cache.set(detailKey, JSON.stringify(vehicleData), { EX: 60 });

    const spatialKey = `spatial:line:${vehicleData.lineId}:way:${vehicleData.lineOperationWay}`;

    const saveSpatialPromise = cache.geoAdd(spatialKey, {
        longitude: vehicleData.longitude,
        latitude: vehicleData.latitude,
        member: vehicleData.vehiclePrefix 
    });

    const registryKey = 'system:active_lines';
    const saveRegistryPromise = cache.sAdd(registryKey, spatialKey);

    await Promise.all([saveDetailPromise, saveSpatialPromise, saveRegistryPromise]);
}