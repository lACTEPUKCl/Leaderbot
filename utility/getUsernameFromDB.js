import { config } from "dotenv";
import { MongoClient } from "mongodb";
config();

const db = process.env.DATABASE_URL;
const client = new MongoClient(db, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const getUsernameFromDB = async (steamId) => {
  try {
    await client.connect();
    const database = client.db("SquadJS");
    const collection = database.collection("mainstats");
    const user = await collection.findOne({
      _id: steamId,
    });

    return user.name;
  } finally {
    await client.close();
  }
};

export default getUsernameFromDB;
