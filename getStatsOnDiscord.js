import { MongoClient } from "mongodb";
import { EmbedBuilder } from "discord.js";
import fetch from "node-fetch";

async function getStatsOnDiscord(db, steamId, message, steamApi) {
  const clientdb = new MongoClient(db);
  const dbName = "SquadJS";
  const dbCollection = "mainstats";
  const responseSteam = await fetch(
    `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApi}&steamids=${steamId}`
  );
  const dataSteam = await responseSteam.json();
  const userInfo = dataSteam.response.players;

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
    // let exampleEmbed = new EmbedBuilder()
    //   .setTitle(user.name.toString())
    //   .setURL(`https://steamcommunity.com/profiles/${steamId}/`)
    //   .addFields(
    //     { name: "Kills", value: user.kills.toString(), inline: true },
    //     { name: "Death", value: user.death.toString(), inline: true },
    //     { name: "Revives", value: user.revives.toString(), inline: true },
    //     { name: "TeamKills", value: user.teamkills.toString(), inline: true },
    //     { name: "Bonuses", value: user.bonuses.toString(), inline: true },
    //     { name: "K/D", value: user.kd.toString(), inline: true }
    //   )
    //   .setColor(0x0099ff);
    const timeplayed = (user.squad.timeplayed.toString() / 60).toFixed(1);
    let roles = Object.entries(user.roles);
    let role = ["", 0];
    roles.forEach((e) => {
      if (role[1] < e[1]) {
        role = e;
      }
    });

    const exampleEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(user.name.toString())
      .setURL(`https://steamcommunity.com/profiles/${steamId}/`)
      //.setDescription("Звание")
      .setThumbnail(userInfo[0].avatarmedium)
      .addFields(
        // { name: "Очков опыта до повышения", value: "Очко" },
        // { name: "\u200B", value: "\u200B" },
        { name: "Убийств", value: user.kills.toString(), inline: true },
        { name: "Смертей", value: user.death.toString(), inline: true },
        { name: "Помощи", value: user.revives.toString(), inline: true },
        { name: "Тимкилов", value: user.teamkills.toString(), inline: true },
        { name: "Бонусов", value: user.bonuses.toString(), inline: true },
        { name: "K/D", value: user.kd.toString(), inline: true },
        {
          name: "Время в игре",
          value: `${timeplayed}ч`,
          inline: true,
        },
        {
          name: "Лучший класс",
          value: role[0].split("_").join("").toUpperCase(),
          inline: true,
        }
      );

    message.reply({ embeds: [exampleEmbed] });
  } catch (e) {
    console.error(e);
  } finally {
    await clientdb.close();
  }
}
export default getStatsOnDiscord;
