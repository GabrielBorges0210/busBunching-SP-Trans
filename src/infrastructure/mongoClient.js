import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;
const client = new MongoClient(uri);

let database;

export async function connectToDatabase() {
    if (database) return database;
    
    await client.connect();
    database = client.db('sptrans_monitor');
    
    console.log('mongo_manager: Connected successfully');
    return database;
}