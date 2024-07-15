import { config } from "dotenv";
import { MongoClient } from "mongodb";
import options from "../config.js";
config();
const { dbName, dbCollection } = options;
const db = process.env.DATABASE_URL;
const client = new MongoClient(db);

const getUsernameFromDB = async (steamId) => {
  try {
    await client.connect();
    const database = client.db(dbName);
    const collection = database.collection(dbCollection);
    const user = await collection.findOne({
      _id: steamId,
    });

    return user ? user.userName : "Unknown";
  } catch (e) {
    console.log(e);
    // } finally {
    //   await client.close();
  }
};

export default getUsernameFromDB;
