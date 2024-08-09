import { MongoClient } from "mongodb";
import { config } from "dotenv";
config();
import options from "../config.js";

const client = new MongoClient(process.env.DATABASE_URL);
const { seedMessageId, seedRoleId, dbName, dbCollection } = options;

async function connectToDatabase() {
  await client.connect();
  return client.db(dbName).collection(dbCollection);
}

async function closeConnection() {
  await client.close();
}

let isBotRemovingReaction = false;

export async function handleReactionAdd(reaction, user) {
  if (reaction.message.id === seedMessageId) {
    const guild = reaction.message.guild;
    const member = guild.members.cache.get(user.id);

    if (member) {
      try {
        const collection = await connectToDatabase();
        const existingUser = await collection.findOne({ discordid: user.id });

        if (existingUser) {
          await member.roles.add(seedRoleId);
          await collection.updateOne(
            { discordid: user.id },
            { $set: { seedRole: true } }
          );
          isBotRemovingReaction = false;
        } else {
          isBotRemovingReaction = true;
          await reaction.users.remove(user.id);
        }
      } catch (e) {
      } finally {
        await closeConnection();
      }
    }
  }
}

export async function handleReactionRemove(reaction, user) {
  if (isBotRemovingReaction) return;
  if (reaction.message.id === seedMessageId) {
    const guild = reaction.message.guild;
    const member = guild.members.cache.get(user.id);

    if (member) {
      await member.roles.remove(seedRoleId);
      try {
        const collection = await connectToDatabase();
        await collection.updateOne(
          { discordId: user.id },
          { $set: { seedRole: false } }
        );
      } catch (error) {
      } finally {
        await closeConnection();
        isBotRemovingReaction = false;
      }
    }
  }
}
