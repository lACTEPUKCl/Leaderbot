import { MongoClient } from "mongodb";
import { config } from "dotenv";
config();

async function getAllData(client) {
  const database = client.db("SquadJS");
  const collection = database.collection("discordadmins");
  const result = await collection.find({}).toArray();
  return result;
}

async function updateAdmins(interaction) {
  const warnMessageId = "1178452783196807179";
  const db = process.env.DATABASE_URL;
  const mongoClient = new MongoClient(db, {
    useUnifiedTopology: true,
  });

  try {
    await mongoClient.connect();

    const allData = await getAllData(mongoClient);
    const tableRows = allData
      .map((admin) => ` ${admin.name}  [${admin.warn}] `)
      .join("\n");

    const channelId = interaction.channelId;
    const channel = interaction.guild.channels.cache.get(channelId);

    const message = await channel.messages.fetch(warnMessageId);

    await message.edit("```" + tableRows + "```");
  } finally {
    await mongoClient.close();
  }
}

export default updateAdmins;
