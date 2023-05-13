import { MongoClient } from "mongodb";
import { EmbedBuilder } from "discord.js";

async function getStatsOnDiscord(db, steamId, message) {
  const clientdb = new MongoClient(db);
  const dbName = "SquadJS";
  const dbCollection = "mainstats";

  try {
    await clientdb.connect();
    const db = clientdb.db(dbName);
    const collection = db.collection(dbCollection);
    const user = await collection.findOne({
      _id: steamId,
    });
    // if (!user) {
    //   message.delete();
    //   return;
    // }
    if (!user) return;

    let exampleEmbed = new EmbedBuilder()
      .setTitle(user.name.toString())
      .setURL(`https://steamcommunity.com/profiles/${steamId}/`)
      .addFields(
        { name: "Kills", value: user.kills.toString(), inline: true },
        { name: "Death", value: user.death.toString(), inline: true },
        { name: "Revives", value: user.revives.toString(), inline: true },
        { name: "TeamKills", value: user.teamkills.toString(), inline: true },
        { name: "Bonuses", value: user.bonuses.toString(), inline: true },
        { name: "K/D", value: user.kd.toString(), inline: true }
      )
      .setColor(0x0099ff);

    message.reply({ embeds: [exampleEmbed] });
  } catch (e) {
    console.error(e);
  } finally {
    await clientdb.close();
  }
}
export default getStatsOnDiscord;
