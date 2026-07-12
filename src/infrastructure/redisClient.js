import { createClient } from 'redis';

let connectionPromise = null;

export async function connectToCache() {
    // Se a conexão já está em andamento ou concluída, retorna a mesma Promise
    if (connectionPromise) {
        return connectionPromise;
    }

    const cacheUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

    console.log("Creating cache client on IPv4...");
    const client = createClient({ url: cacheUrl });

    client.on('error', (error) => {
        console.error('cache_connection_failed', error.message);
    });

    // Evitar concorrência (Race Condition)
    connectionPromise = client.connect().then(() => client).catch((err) => {
        connectionPromise = null; // Reseta em caso de falha para tentar novamente
        throw err;
    });

    return connectionPromise;
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