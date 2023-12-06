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
      .map((admin) => {
        const dateObject = new Date(admin.lastseen);
        const formattedDate = `${dateObject.getFullYear()}-${(
          dateObject.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}-${dateObject
          .getDate()
          .toString()
          .padStart(2, "0")} ${dateObject
          .getHours()
          .toString()
          .padStart(2, "0")}:${dateObject
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${dateObject
          .getSeconds()
          .toString()
          .padStart(2, "0")}`;

        return ` ${admin.name}  [${admin.warn}] [${formattedDate}]`;
      })
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
