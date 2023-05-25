import { MongoClient } from "mongodb";
import { AttachmentBuilder } from "discord.js";
import fetch from "node-fetch";
import * as fs from "fs";
import { loadImage, createCanvas, registerFont } from "canvas";
import calcVehicleTime from "./calcVehicleTime.js";

async function getStatsOnDiscord(dblink, steamId, message, steamApi) {
  const clientdb = new MongoClient(dblink);
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
    // // if (!user) {
    // //   message.delete();
    // //   return;
    // // }
    if (!user) return;
    // // let exampleEmbed = new EmbedBuilder()
    // //   .setTitle(user.name.toString())
    // //   .setURL(`https://steamcommunity.com/profiles/${steamId}/`)
    // //   .addFields(
    // //     { name: "Kills", value: user.kills.toString(), inline: true },
    // //     { name: "Death", value: user.death.toString(), inline: true },
    // //     { name: "Revives", value: user.revives.toString(), inline: true },
    // //     { name: "TeamKills", value: user.teamkills.toString(), inline: true },
    // //     { name: "Bonuses", value: user.bonuses.toString(), inline: true },
    // //     { name: "K/D", value: user.kd.toString(), inline: true }
    // //   )
    // //   .setColor(0x0099ff);
    const timeplayed = (user.squad.timeplayed.toString() / 60).toFixed(1);
    const roles = Object.entries(user.roles);
    const sortRoles = roles.sort((a, b) => b[1] - a[1]);
    const weapons = Object.entries(user.weapons);
    const sortWeapons = weapons.sort((a, b) => b[1] - a[1]);
    const time = (await gettime(user.squad.timeplayed)) || 0;
    // const d = Math.floor(time / 1440);
    // const h = Math.floor((time % 1440) / 60);
    // const dDisplay = d > 0 ? d + "д " : "";
    // const hDisplay = h > 0 ? h + "ч " : "";
    const roleTime1 = (await gettime(sortRoles[0][1].toString())) || 0;
    const roleTime2 = (await gettime(sortRoles[1][1].toString())) || 0;
    const role1Img = sortRoles[0][0].split("_").join("");
    const role2Img = sortRoles[1][0].split("_").join("");
    const leader = (await gettime(user.squad.leader.toString())) || 0;
    const cmd = (await gettime(user.squad.cmd.toString())) || 0;
    const vehicle = await calcVehicleTime(user.possess);
    const heliTime = (await gettime(vehicle[1])) || 0;
    const heavyTime = (await gettime(vehicle[0])) || 0;

    async function gettime(time) {
      const d = Math.floor(time / 1440);
      const h = Math.floor((time % 1440) / 60);
      const dDisplay = d > 0 ? d + "д " : "";
      const hDisplay = h > 0 ? h + "ч" : "";
      return dDisplay + hDisplay;
    }

    const killPerMatch = user.kills / user.matches.matches;

    const font = registerFont("./img/Tektur-Bold.ttf", {
      family: "MyFont",
    });

    const width = 1405;
    const height = 729;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    loadImage("./img/stats.png")
      .then((img) => {
        ctx.drawImage(img, 0, 0, 1405, 729);
        loadImage(`./img/Icon_${role1Img}_kit.png`)
          .then((img1) => {
            ctx.drawImage(img1, 15, 297, 40, 40);
            loadImage(`./img/Icon_${role2Img}_kit.png`)
              .then((img2) => {
                ctx.drawImage(img2, 15, 393, 40, 40);
                ctx.fillStyle = "#efefef";
                ctx.font = "20pt MyFont";
                ctx.fillText(user.name, 393, 48); // Имя
                ctx.textAlign = "center";
                ctx.fillText("Звание", 152, 37);
                ctx.fillText("Любимые киты", 152, 242);
                ctx.fillText("Любимое оружие", 152, 510);
                ctx.textAlign = "left";
                ctx.fillText("История", 393, 469);
                ctx.fillText(
                  sortRoles[0][0].split("_").join("").toUpperCase(),
                  60,
                  327
                ); // Первая роль
                ctx.fillText(
                  sortRoles[1][0].split("_").join("").toUpperCase(),
                  60,
                  422
                ); // Вторая роль
                // ctx.fillText("M4A1", 60, 607); // Первое оружие
                // ctx.fillText("AK47", 60, 700); // Второе оружие
                ctx.textAlign = "right";
                ctx.font = "15pt MyFont";
                ctx.fillText(roleTime1, 290, 327); // Первая роль (время)
                ctx.fillText(roleTime2, 290, 422); // Вторая роль (время)
                // ctx.fillText("789", 280, 607);
                // ctx.fillText("098", 280, 700);
                ctx.textAlign = "left";
                ctx.fillStyle = "#95a6b9";
                ctx.fillText(time, 1171, 45);
                ctx.fillText(`${user.matches.matches} игр`, 1271, 45); // Всего игр
                ctx.fillText("Убийств", 364, 188);
                ctx.fillText("Убийств за игру", 626, 188);
                ctx.fillText("У/С", 888, 188);
                ctx.fillText("% Побед", 1151, 188);
                ctx.textAlign = "center";
                ctx.fillText("Рядовой-Генерал", 152, 68);
                ctx.textAlign = "left";
                ctx.fillText("Кит", 15, 275);
                ctx.fillText("Оружие", 15, 545);

                ctx.fillStyle = "#efefef";
                ctx.font = "20pt MyFont";
                ctx.fillText(user.kills.toString(), 364, 220); // Убийств
                ctx.fillText(`${~~killPerMatch}`, 626, 220); // Убийств за игру
                ctx.fillText(user.kd.toString(), 888, 220); // КД
                ctx.fillText(
                  `${~~user.matches.winrate.toString()}%`,
                  1151,
                  220
                ); // % Побед

                ctx.fillText(user.matches.won.toString(), 354, 303); //Побед
                ctx.fillText(user.matches.lose.toString(), 532, 303); // Поражений
                ctx.fillText(user.revives.toString(), 709, 303); // Помощь
                ctx.fillText(user.teamkills.toString(), 887, 303); // Тимкилы
                ctx.fillText(user.death.toString(), 1065, 303); // Смерти
                ctx.fillText(user.bonuses.toString(), 1242, 303); // Бонусы

                ctx.fillText(leader, 354, 384); // Свадной
                ctx.fillText(cmd || 0, 532, 384); // ЦМД
                ctx.fillText(heliTime, 709, 384); // Пилот
                ctx.fillText(heavyTime, 887, 384); // Мехвод
                // ctx.fillText("10", 1065, 384); //
                // ctx.fillText("11", 1242, 384); //

                ctx.fillStyle = "#95a6b9";
                ctx.font = "15pt MyFont";
                ctx.fillText("Побед", 354, 271);
                ctx.fillText("Поражений", 532, 271);
                ctx.fillText("Помощь", 709, 271);
                ctx.fillText("Тимкилы", 887, 271);
                ctx.fillText("Смерти", 1065, 271);
                ctx.fillText("Бонусы", 1242, 271);

                ctx.fillText("Сквадной", 354, 352);
                ctx.fillText("ЦМД", 532, 352);
                ctx.fillText("Пилот", 709, 352);
                ctx.fillText("Мехвод", 887, 352);
                // ctx.fillText("stats", 1065, 352);
                //ctx.fillText("stats", 1242, 352);

                ctx.textAlign = "right";
                ctx.fillStyle = "#95a6b9";
                ctx.font = "15pt MyFont";
                ctx.fillText("Время", 290, 275);
                ctx.fillText("Убийств", 290, 545);
                ctx.fillText("Карта", 424, 525);
                ctx.fillText("Время игры", 780, 525);
                ctx.fillText("Результат", 971, 525);
                ctx.fillText("У/С", 1089, 525);
                ctx.fillText("Убийств", 1218, 525);
                ctx.fillText("Смертей", 1351, 525);

                ctx.textAlign = "left";
                ctx.fillStyle = "#efefef";
                ctx.font = "20pt MyFont";
                // ctx.fillText("Albasrah raas v1", 354, 565);
                // ctx.fillText("Albasrah raas v1", 354, 605);
                // ctx.fillText("Albasrah raas v1", 354, 645);
                // ctx.fillText("Albasrah raas v1", 354, 685);

                // ctx.textAlign = "right";
                // ctx.fillText("1h 10m", 780, 565);
                // ctx.fillText("Win", 971, 565);
                // ctx.fillText("1", 1089, 565);
                // ctx.fillText("10", 1218, 565);
                // ctx.fillText("10", 1351, 565);

                // ctx.fillText("1h 10m", 780, 605);
                // ctx.fillText("Win", 971, 605);
                // ctx.fillText("1", 1089, 605);
                // ctx.fillText("10", 1218, 605);
                // ctx.fillText("10", 1351, 605);

                // ctx.fillText("1h 10m", 780, 645);
                // ctx.fillText("Win", 971, 645);
                // ctx.fillText("1", 1089, 645);
                // ctx.fillText("10", 1218, 645);
                // ctx.fillText("10", 1351, 645);

                // ctx.fillText("1h 10m", 780, 685);
                // ctx.fillText("Win", 971, 685);
                // ctx.fillText("1", 1089, 685);
                // ctx.fillText("10", 1218, 685);
                // ctx.fillText("10", 1351, 685);

                const x0 = 20;
                const y0 = 150;
                const width1 = 265;
                const height1 = 25;
                const gradient = ctx.createLinearGradient(
                  x0,
                  y0,
                  x0 + width1,
                  y0
                );
                gradient.addColorStop(0.0, "green");
                gradient.addColorStop(1.0, "#05310f");
                ctx.clearRect(x0, y0, width1, height1);
                const pct = 0;
                ctx.fillStyle = gradient;
                ctx.fillRect(x0, y0, width1 * pct, height1);

                // outline the full progress bar
                ctx.strokeStyle = "black";
                ctx.strokeRect(x0, y0, width1, height1);
                ctx.textAlign = "center";
                ctx.font = "17pt MyFont";
                ctx.fillStyle = "#efefef";
                ctx.fillText("1000/10000", 159, 170);

                // image

                // const exampleEmbed = new EmbedBuilder()
                //   .setColor(0x0099ff)
                //   .setTitle(user.name.toString())
                //   .setURL(`https://steamcommunity.com/profiles/${steamId}/`)
                //   //.setDescription("Звание")
                //   .setThumbnail(userInfo[0].avatarmedium)
                //   .addFields(
                //     // { name: "Очков опыта до повышения", value: "Очко" },
                //     // { name: "\u200B", value: "\u200B" },
                //     { name: "Убийств", value: user.kills.toString(), inline: true },
                //     { name: "Смертей", value: user.death.toString(), inline: true },
                //     { name: "Помощи", value: user.revives.toString(), inline: true },
                //     { name: "Тимкилов", value: user.teamkills.toString(), inline: true },
                //     { name: "Бонусов", value: user.bonuses.toString(), inline: true },
                //     { name: "K/D", value: user.kd.toString(), inline: true },
                //     {
                //       name: "Время в игре",
                //       value: `${timeplayed}ч`,
                //       inline: true,
                //     },
                //     {
                //       name: "Лучший класс",
                //       value: role[0].split("_").join("").toUpperCase(),
                //       inline: true,
                //     }
                //   );
                const buffer = canvas.toBuffer("image/png");
                fs.writeFileSync("./stats.png", buffer);
                const imageToSend = new AttachmentBuilder("stats.png");
                message.reply({ files: [imageToSend] });
              })
              .catch((err) => console.log("Image stats not found"));
          })
          .catch((err) => console.log(`Image ${role1Img} not found`));
        //get context
      })
      .catch((err) => console.log(`Image ${role2Img} not found`));
  } catch (e) {
    console.error(e);
  } finally {
    await clientdb.close();
  }
}
export default getStatsOnDiscord;
