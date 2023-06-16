import { AttachmentBuilder } from "discord.js";
import sortUsers from "./sortUsers.js";
import * as fs from "fs";
import { loadImage, createCanvas, registerFont } from "canvas";

function getNickname(player) {
  const splitName = player.split(/\s+/);
  const filteredNickname = splitName.filter((name) => isNaN(name));
  const result = filteredNickname.join(" ");
  return result;
}

function getStats(player, sort) {
  const numbers = player.split(/\s+/).filter((num) => !isNaN(num));
  const stats = ["kills", "death", "revives", "teamkills", "kd", "matches"];

  if (stats.includes(sort)) {
    const statIndex = stats.indexOf(sort);
    return numbers[statIndex];
  }

  return null;
}

function getColumnName(sort) {
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

async function editEmbed({
  channel,
  db,
  sort,
  messageId,
  authorName,
  seconds,
}) {
  setTimeout(async () => {
    const players = await sortUsers(db, sort);
    await channel.messages
      .fetch(`${messageId}`)
      .then((message) => {
        const playersTable = Array(20)
          .fill(0)
          .map((e, i) => players[i]);
        const width = 982;
        const height = 1250;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        registerFont("./img/Tektur-Regular.ttf", {
          family: "MyFont",
        });
        loadImage("./img/leaderboarddefault.png").then((img) => {
          ctx.drawImage(img, 0, 0, width, height);

          ctx.fillStyle = "#efefef";
          ctx.font = "20pt MyFont";
          ctx.fillText(authorName, 112, 50); // Название таблицы
          ctx.fillText(getNickname(playersTable[0]), 112, 148); // Ник1
          ctx.fillText(getNickname(playersTable[1]), 112, 205); // Ник2
          ctx.fillText(getNickname(playersTable[2]), 112, 262); // Ник3
          ctx.fillText(getNickname(playersTable[3]), 112, 320); // Ник4
          ctx.fillText(getNickname(playersTable[4]), 112, 377); // Ник5
          ctx.fillText(getNickname(playersTable[5]), 112, 434); // Ник6
          ctx.fillText(getNickname(playersTable[6]), 112, 491); // Ник7
          ctx.fillText(getNickname(playersTable[7]), 112, 548); // Ник8
          ctx.fillText(getNickname(playersTable[8]), 112, 605); // Ник9
          ctx.fillText(getNickname(playersTable[9]), 112, 662); // Ник10
          ctx.fillText(getNickname(playersTable[10]), 112, 719); // Ник11
          ctx.fillText(getNickname(playersTable[11]), 112, 776); // Ник12
          ctx.fillText(getNickname(playersTable[12]), 112, 833); // Ник13
          ctx.fillText(getNickname(playersTable[13]), 112, 890); // Ник14
          ctx.fillText(getNickname(playersTable[14]), 112, 947); // Ник15
          ctx.fillText(getNickname(playersTable[15]), 112, 1004); // Ник16
          ctx.fillText(getNickname(playersTable[16]), 112, 1061); // Ник17
          ctx.fillText(getNickname(playersTable[17]), 112, 1118); // Ник18
          ctx.fillText(getNickname(playersTable[18]), 112, 1175); // Ник19
          ctx.fillText(getNickname(playersTable[19]), 112, 1232); // Ник20
          ctx.textAlign = "right";
          ctx.fillText(getStats(playersTable[0], sort), 830, 148); // Ник1
          ctx.fillText(getStats(playersTable[1], sort), 830, 205); // Ник2
          ctx.fillText(getStats(playersTable[2], sort), 830, 262); // Ник3
          ctx.fillText(getStats(playersTable[3], sort), 830, 320); // Ник4
          ctx.fillText(getStats(playersTable[4], sort), 830, 377); // Ник5
          ctx.fillText(getStats(playersTable[5], sort), 830, 434); // Ник6
          ctx.fillText(getStats(playersTable[6], sort), 830, 491); // Ник7
          ctx.fillText(getStats(playersTable[7], sort), 830, 548); // Ник8
          ctx.fillText(getStats(playersTable[8], sort), 830, 605); // Ник9
          ctx.fillText(getStats(playersTable[9], sort), 830, 662); // Ник10
          ctx.fillText(getStats(playersTable[10], sort), 830, 719); // Ник11
          ctx.fillText(getStats(playersTable[11], sort), 830, 776); // Ник12
          ctx.fillText(getStats(playersTable[12], sort), 830, 833); // Ник13
          ctx.fillText(getStats(playersTable[13], sort), 830, 890); // Ник14
          ctx.fillText(getStats(playersTable[14], sort), 830, 947); // Ник15
          ctx.fillText(getStats(playersTable[15], sort), 830, 1004); // Ник16
          ctx.fillText(getStats(playersTable[16], sort), 830, 1061); // Ник17
          ctx.fillText(getStats(playersTable[17], sort), 830, 1118); // Ник18
          ctx.fillText(getStats(playersTable[18], sort), 830, 1175); // Ник19
          ctx.fillText(getStats(playersTable[19], sort), 830, 1232); // Ник20

          ctx.fillText(getStats(playersTable[0], "matches"), 950, 148); // Ник1
          ctx.fillText(getStats(playersTable[1], "matches"), 950, 205); // Ник2
          ctx.fillText(getStats(playersTable[2], "matches"), 950, 262); // Ник3
          ctx.fillText(getStats(playersTable[3], "matches"), 950, 320); // Ник4
          ctx.fillText(getStats(playersTable[4], "matches"), 950, 377); // Ник5
          ctx.fillText(getStats(playersTable[5], "matches"), 950, 434); // Ник6
          ctx.fillText(getStats(playersTable[6], "matches"), 950, 491); // Ник7
          ctx.fillText(getStats(playersTable[7], "matches"), 950, 548); // Ник8
          ctx.fillText(getStats(playersTable[8], "matches"), 950, 605); // Ник9
          ctx.fillText(getStats(playersTable[9], "matches"), 950, 662); // Ник10
          ctx.fillText(getStats(playersTable[10], "matches"), 950, 719); // Ник11
          ctx.fillText(getStats(playersTable[11], "matches"), 950, 776); // Ник12
          ctx.fillText(getStats(playersTable[12], "matches"), 950, 833); // Ник13
          ctx.fillText(getStats(playersTable[13], "matches"), 950, 890); // Ник14
          ctx.fillText(getStats(playersTable[14], "matches"), 950, 947); // Ник15
          ctx.fillText(getStats(playersTable[15], "matches"), 950, 1004); // Ник16
          ctx.fillText(getStats(playersTable[16], "matches"), 950, 1061); // Ник17
          ctx.fillText(getStats(playersTable[17], "matches"), 950, 1118); // Ник18
          ctx.fillText(getStats(playersTable[18], "matches"), 950, 1175); // Ник19
          ctx.fillText(getStats(playersTable[19], "matches"), 950, 1232); // Ник20
          ctx.font = "12pt MyFont";
          ctx.fillText("Ранг", 65, 102); // 3 колонка
          ctx.fillText("Игрок", 160, 102); // 3 колонка
          ctx.fillText(getColumnName(sort), 830, 102); // 3 колонка
          ctx.fillText("Матчей", 950, 102); // 3 колонка
          const buffer = canvas.toBuffer("image/png");
          fs.writeFileSync("./leaderboard.png", buffer);
          const imageToSend = new AttachmentBuilder("leaderboard.png");
          message.edit({ files: [imageToSend] });
        });
      })
      .catch(console.error);
  }, seconds);
}
export default editEmbed;
