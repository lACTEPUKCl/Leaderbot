import { MongoClient } from "mongodb";
import { AttachmentBuilder } from "discord.js";
import fetch from "node-fetch";
import * as fs from "fs";
import { loadImage, createCanvas, registerFont } from "canvas";
import calcVehicleTime from "./calcVehicleTime.js";
import getExp from "./getExp.js";

async function loadImageAndDraw(ctx, imgPath, x, y, width, height) {
  try {
    const img = await loadImage(imgPath);
    ctx.drawImage(img, x, y, width, height);
  } catch (err) {
    console.log(`Image ${imgPath} not found`);
  }
}

async function gettime(time, field) {
  if (field === "sec") {
    time = time / 1000;
    const h = Math.floor((time % (3600 * 24)) / 3600);
    const m = Math.floor((time % 3600) / 60);
    const hDisplay = h > 0 ? h + "ч" : "";
    const mDisplay = m > 0 ? m + "м" : "";
    return hDisplay + mDisplay;
  }
  const d = Math.floor(time / 1440);
  const h = Math.floor((time % 1440) / 60);
  const dDisplay = d > 0 ? d + "д " : "";
  const hDisplay = h > 0 ? h + "ч " : "";
  return dDisplay + hDisplay;
}

async function getStatsOnDiscord(dblink, steamId, message, steamApi) {
  const clientdb = new MongoClient(dblink);
  const dbName = "SquadJS";
  const dbCollection = "mainstats";
  // const responseSteam = await fetch(
  //   `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApi}&steamids=${steamId}`
  // );
  // const dataSteam = await responseSteam.json();
  // const userInfo = dataSteam.response.players;

  try {
    await clientdb.connect();
    const db = clientdb.db(dbName);
    const collection = db.collection(dbCollection);
    const user = await collection.findOne({
      _id: steamId,
    });
    if (!user) return;
    const roles = Object.entries(user.roles);
    let sortRoles = roles.sort((a, b) => b[1] - a[1]);
    const weapons = Object.entries(user.weapons);
    const resultWeapons = {};
    let artillerySum = 0;
    let knifeSum = 0;

    for (const [key, value] of weapons) {
      console.log(key);
      let [prefix, suffix] = key.split("_")[1].includes("Projectile")
        ? key.split("_").slice(1, 3)
        : [key.split("_")[1]];

      const weaponKey = suffix ? `${prefix} ${suffix}` : prefix;
      if (weaponKey === "Projectile 155mm" || weaponKey === "Heavy") {
        artillerySum += value;
      } else {
        resultWeapons[weaponKey] = (resultWeapons[weaponKey] || 0) + value;
      }

      if (
        weaponKey === "SOCP" ||
        weaponKey === "AK74Bayonet" ||
        weaponKey === "M9Bayonet" ||
        weaponKey === "G3Bayonet" ||
        weaponKey === "Bayonet2000" ||
        weaponKey === "AKMBayonet" ||
        weaponKey === "SA80Bayonet" ||
        weaponKey === "QNL-95" ||
        weaponKey === "OKC-3S"
      ) {
        knifeSum += value;
      }
    }
    console.log(Object.entries(resultWeapons));
    const resultArray = Object.entries(resultWeapons).sort(
      (a, b) => b[1] - a[1]
    );
    console.log(resultArray);
    const time = (await gettime(user.squad.timeplayed)) || 0;
    const player = user.matches.history.matches;
    const roleTime1 = await gettime(sortRoles[0][1].toString());
    const roleTime2 = await gettime(sortRoles[1][1].toString());
    const role1Img = sortRoles[0][0].split("_").join("");
    const role2Img = sortRoles[1][0].split("_").join("");
    const leader = (await gettime(user.squad.leader.toString())) || 0;
    const cmd = (await gettime(user.squad.cmd.toString())) || 0;
    const vehicle = await calcVehicleTime(user.possess);
    const heliTime = (await gettime(vehicle[1])) || 0;
    const heavyTime = (await gettime(vehicle[0])) || 0;
    const historyTime1 = (await gettime(player[0]?.timeplayed, "sec")) || 0;
    const historyTime2 = (await gettime(player[1]?.timeplayed, "sec")) || 0;
    const historyTime3 = (await gettime(player[2]?.timeplayed, "sec")) || 0;
    const killPerMatch = user.kills / user.matches.matches;
    const exp = getExp(user);
    registerFont("./img/Tektur-Bold.ttf", {
      family: "MyFont",
    });

    const width = 1405;
    const height = 729;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    await loadImageAndDraw(ctx, "./img/stats.png", 0, 0, 1405, 729);
    await loadImageAndDraw(
      ctx,
      `./img/Icon_${role1Img}_kit.png`,
      15,
      297,
      40,
      40
    );
    await loadImageAndDraw(
      ctx,
      `./img/Icon_${role2Img}_kit.png`,
      15,
      393,
      40,
      40
    );

    ctx.fillStyle = "#efefef";
    ctx.font = "18pt MyFont";
    ctx.fillText(user.name, 393, 48); // Имя
    ctx.textAlign = "center";
    ctx.fillText("Звание", 152, 37);
    ctx.fillText("Любимые киты", 152, 242);
    ctx.fillText("Любимое оружие", 152, 510);
    ctx.textAlign = "left";
    ctx.fillText("История", 393, 469);
    ctx.fillText(sortRoles[0][0].split("_").join("").toUpperCase(), 60, 327); // Первая роль
    ctx.fillText(sortRoles[1][0].split("_").join("").toUpperCase(), 60, 422); // Вторая роль

    if (resultArray.length != 0) {
      ctx.textAlign = "left";
      //ctx.fillText(resultArray[0][0], 15, 600); // Первое оружие
      await loadImageAndDraw(
        ctx,
        `./img/weapons/${resultArray[0][0]}.png`,
        5,
        550,
        160,
        80
      );
      ctx.textAlign = "right";
      ctx.fillText(resultArray[0][1], 290, 600); // Первое оружие
    }
    if (resultArray.length >= 2) {
      ctx.fillText(resultArray[1][1], 290, 690); // Второе оружие
      ctx.textAlign = "left";
      // ctx.fillText(resultArray[1][0], 15, 690); // Второе оружие
      await loadImageAndDraw(
        ctx,
        `./img/weapons/${resultArray[1][0]}.png`,
        5,
        640,
        160,
        80
      );
    }

    ctx.textAlign = "right";
    ctx.font = "15pt MyFont";
    ctx.fillText(roleTime1, 290, 327); // Первая роль (время)
    ctx.fillText(roleTime2, 290, 422); // Вторая роль (время)

    ctx.textAlign = "left";
    ctx.fillStyle = "#95a6b9";
    ctx.fillText(time, 1171, 45);
    ctx.fillText(`${user.matches.matches} игр`, 1271, 45); // Всего игр
    ctx.fillText("Убийств", 364, 188);
    ctx.fillText("Убийств за игру", 626, 188);
    ctx.fillText("У/С", 888, 188);
    ctx.fillText("% Побед", 1151, 188);
    ctx.textAlign = "center";
    ctx.fillText(exp.rankStr, 152, 68);
    ctx.textAlign = "left";
    ctx.fillText("Кит", 15, 275);
    ctx.fillText("Оружие", 15, 545);

    ctx.fillStyle = "#efefef";
    ctx.font = "20pt MyFont";
    ctx.fillText(user.kills.toString(), 364, 220); // Убийств
    ctx.fillText(`${~~killPerMatch}`, 626, 220); // Убийств за игру
    ctx.fillText(user.kd.toString(), 888, 220); // КД
    ctx.fillText(`${~~user.matches.winrate.toString()}%`, 1151, 220); // % Побед

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
    ctx.fillText(artillerySum || 0, 1065, 384); //
    ctx.fillText(knifeSum, 1242, 384); //

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
    ctx.fillText("Арта", 1065, 352);
    ctx.fillText("Нож", 1242, 352);

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
    // if (player[0]?.layer) {
    //   ctx.fillText(player[0].layer, 354, 575);
    //   ctx.textAlign = "right";
    //   ctx.fillText(historyTime1, 780, 575);
    //   ctx.fillText(player[0].result, 971, 575);
    //   ctx.fillText(player[0].kd, 1089, 575);
    //   ctx.fillText(player[0].kills, 1218, 575);
    //   ctx.fillText(player[0].death, 1351, 575);
    // }

    // if (player[1]?.layer) {
    //   ctx.textAlign = "left";
    //   ctx.fillText(player[1].layer, 354, 625);
    //   ctx.textAlign = "right";
    //   ctx.fillText(historyTime2, 780, 625);
    //   ctx.fillText(player[1].result, 971, 625);
    //   ctx.fillText(player[1].kd, 1089, 625);
    //   ctx.fillText(player[1].kills, 1218, 625);
    //   ctx.fillText(player[1].death, 1351, 625);
    // }

    // if (player[2]?.layer) {
    //   ctx.textAlign = "left";
    //   ctx.fillText(player[2].layer, 354, 675);
    ctx.textAlign = "right";
    //   ctx.fillText(historyTime3, 780, 675);
    //   ctx.fillText(player[2].result, 971, 675);
    //   ctx.fillText(player[2].kd, 1089, 675);
    //   ctx.fillText(player[2].kills, 1218, 675);
    //   ctx.fillText(player[2].death, 1351, 675);
    // }

    const x0 = 20;
    const y0 = 150;
    const width1 = 265;
    const height1 = 25;
    const gradient = ctx.createLinearGradient(x0, y0, x0 + width1, y0);
    gradient.addColorStop(0.0, "green");
    gradient.addColorStop(1.0, "#05310f");
    ctx.clearRect(x0, y0, width1, height1);
    const pct = exp.rankPct;
    ctx.fillStyle = gradient;
    ctx.fillRect(x0, y0, width1 * pct, height1);

    // outline the full progress bar
    ctx.strokeStyle = "black";
    ctx.strokeRect(x0, y0, width1, height1);
    ctx.textAlign = "center";
    ctx.font = "17pt MyFont";
    ctx.fillStyle = "#efefef";
    ctx.fillText(exp.expProgress, 159, 170);

    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync("./stats.png", buffer);
    const imageToSend = new AttachmentBuilder("stats.png");
    message.reply({ files: [imageToSend] });
  } catch (e) {
    console.error(e);
  } finally {
    await clientdb.close();
  }
}
export default getStatsOnDiscord;
