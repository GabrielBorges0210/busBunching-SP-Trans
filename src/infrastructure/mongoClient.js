import { MongoClient } from 'mongodataBase';

const uri = process.env.MONGO_URL;
const client = new MongoClient(uri);

let dataBase;

export async function connectToDatabase() {
    if (dataBase) return dataBase;
    await client.connect();
    dataBase = client.dataBase('sptrans_monitor');
    console.log('mongo_manager: Connected successfully');
    return dataBase;
}