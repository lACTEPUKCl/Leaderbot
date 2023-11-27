import { AttachmentBuilder } from "discord.js";
import sortUsers from "./sortUsers.js";
import * as fs from "fs";
import { loadImage, createCanvas, registerFont } from "canvas";

async function getNickname(player) {
  if (!player) return "";
  const splitName = player.split(" ");
  const filteredNickname = splitName.slice(0, -6).join(" ");
  return filteredNickname;
}

async function getStats(player, sort) {
  if (!player) return "";
  const numbers = player.split(/\s+/).filter((num) => !isNaN(num));
  const stats = ["kills", "death", "revives", "teamkills", "kd", "matches"];

  if (stats.includes(sort)) {
    const statIndex = stats.indexOf(sort);
    return numbers[statIndex];
  }

  return null;
}

async function getColumnName(sort) {
  const stats = {
    kills: "Убийств",
    death: "Смертей",
    revives: "Помощь",
    teamkills: "ТК",
    kd: "У/С",
  };

  const matchedStat = Object.keys(stats).find((stat) => sort.includes(stat));

  if (matchedStat) {
    return stats[matchedStat];
  }

  return null;
}

async function leaderboard({
  channel,
  db,
  sort,
  messageId,
  authorName,
  seconds,
  status,
}) {
  setTimeout(async () => {
    const players = await sortUsers(db, sort, status);
    const message = await channel.messages.fetch(messageId);

    const playersTable = Array(20)
      .fill(0)
      .map((e, i) => players[i]);
    const width = 982;
    const height = 1250;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    registerFont("./img/Tektur-Regular.ttf", {
      family: "MyFont1",
    });

    const img = await loadImage("./img/leaderboard.png");
    ctx.drawImage(img, 0, 0, width, height);

    ctx.fillStyle = "#efefef";
    ctx.font = "20pt MyFont1";
    ctx.textAlign = "left";

    const startTextY = 148;
    const textYSpacing = 57;
    const statsX = 830;
    const matchesX = 950;

    for (let i = 0; i < 20; i++) {
      ctx.textAlign = "left";
      const playerName = await getNickname(playersTable[i]);
      ctx.textAlign = "right";
      const statsValue = await getStats(playersTable[i], sort);
      const matchesValue = await getStats(playersTable[i], "matches");

      const textY = startTextY + i * textYSpacing;
      ctx.textAlign = "left";
      ctx.fillText(playerName, 112, textY);
      ctx.textAlign = "right";
      ctx.fillText(statsValue, statsX, textY);
      ctx.fillText(matchesValue, matchesX, textY);
    }
    ctx.textAlign = "left";
    ctx.fillText(authorName, 112, 50);
    ctx.font = "12pt MyFont1";
    ctx.textAlign = "right";
    ctx.fillText("Ранг", 65, 102);
    ctx.fillText("Игрок", 160, 102);
    ctx.fillText(await getColumnName(sort), statsX, 102);
    ctx.fillText("Матчей", matchesX, 102);

    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync("./leaderboard.png", buffer);

    const imageToSend = new AttachmentBuilder("leaderboard.png");
    message.edit({ files: [imageToSend] });
  }, seconds);
}
export default leaderboard;
