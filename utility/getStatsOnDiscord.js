import { MongoClient } from "mongodb";
import { AttachmentBuilder } from "discord.js";
import * as fs from "fs";
import { loadImage, createCanvas, registerFont } from "canvas";
import calcVehicleTime from "./calcVehicleTime.js";
import getExp from "./getExp.js";
import {
  groupWeapons,
  calcVehicleKillsFromGrouped,
  calcArtilleryKills,
  calcKnifeKills,
} from "./weaponMapping.js";
import {
  parseFactions,
  getFactionFlag,
  parseGameMode,
} from "./factionMapping.js";

async function loadImageAndDraw(ctx, imgPath, x, y, width, height) {
  try {
    const img = await loadImage(imgPath);
    ctx.drawImage(img, x, y, width, height);
  } catch (err) {
    console.log(`Image ${imgPath} not found`);
  }
}

function gettime(time, field) {
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

function getMatchDuration(startTime, endTime) {
  if (!startTime || !endTime) return "—";
  const diffMs = endTime - startTime;
  const totalMin = Math.floor(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}ч${m > 0 ? m + "м" : ""}`;
  return `${m}м`;
}

function translateResult(result) {
  if (!result) return "—";
  const lower = result.toLowerCase();
  if (lower === "won") return "Победа";
  if (lower === "lose" || lower === "lost") return "Поражение";
  if (lower === "draw") return "Ничья";
  return result;
}

function getResultColor(result) {
  if (!result) return "#95a6b9";
  const lower = result.toLowerCase();
  if (lower === "won") return "#4ade80";
  if (lower === "lose" || lower === "lost") return "#f87171";
  return "#95a6b9";
}

async function getStatsOnDiscord(dblink, steamId, interaction, steamApi) {
  const clientdb = new MongoClient(dblink);
  const dbName = "SquadJS";
  const dbCollection = "mainstats";

  try {
    await clientdb.connect();
    const db = clientdb.db(dbName);
    const collection = db.collection(dbCollection);
    const user = await collection.findOne({
      _id: steamId,
    });
    if (!user) {
      await interaction.editReply({
        content: "Игрок не найден в базе данных.",
        ephemeral: true,
      });
      return;
    }
    const roles = Object.entries(user.roles);
    let sortRoles = roles.sort((a, b) => b[1] - a[1]);
    const grouped = groupWeapons(user.weapons || {});
    const vehicleKills = calcVehicleKillsFromGrouped(grouped);
    const artillerySum = calcArtilleryKills(grouped);
    const knifeSum = calcKnifeKills(grouped);
    const topWeapons = grouped.slice(0, 2);
    const time = gettime(user.squad?.timeplayed?.toString()) || "0";
    const roleTime1 = gettime(sortRoles[0][1].toString());
    const roleTime2 = gettime(sortRoles[1][1].toString());
    const role1Img = sortRoles[0][0].split("_").join("");
    const role2Img = sortRoles[1][0].split("_").join("");
    const leader = gettime(user.squad.leader?.toString()) || "0";
    const cmd = gettime(user.squad.cmd?.toString()) || "0";
    const vehicle = await calcVehicleTime(user.possess);
    const heliTime = gettime(vehicle[1]) || "0";
    const heavyTime = gettime(vehicle[0]) || "0";
    const killPerMatch = user.kills / user.matches.matches;
    const exp = getExp(user);
    const width = 1405;
    const height = 729;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    const rank = exp.img;

    await loadImageAndDraw(ctx, "./img/stats.png", 0, 0, 1405, 729);
    await loadImageAndDraw(
      ctx,
      `./img/Icon_${role1Img}_kit.png`,
      15,
      297,
      40,
      40,
    );
    await loadImageAndDraw(
      ctx,
      `./img/Icon_${role2Img}_kit.png`,
      15,
      393,
      40,
      40,
    );
    await loadImageAndDraw(ctx, `./img/ranks/${rank}.png`, 69, 85, 170, 51);

    ctx.fillStyle = "#efefef";
    ctx.font = "18pt MyFont";
    ctx.fillText(user.name, 393, 48);
    ctx.textAlign = "center";
    ctx.fillText("Звание", 152, 37);
    ctx.fillText("Любимые киты", 152, 242);
    ctx.fillText("Любимое оружие", 152, 510);
    ctx.textAlign = "left";
    ctx.fillText("История", 393, 469);
    ctx.fillText(sortRoles[0][0].split("_").join("").toUpperCase(), 60, 327);
    ctx.fillText(sortRoles[1][0].split("_").join("").toUpperCase(), 60, 422);

    // ──── Top weapons (any category) ────
    if (topWeapons.length > 0) {
      const w1 = topWeapons[0];
      ctx.textAlign = "left";
      if (w1.image) {
        await loadImageAndDraw(
          ctx,
          `./img/weapons/${w1.image}`,
          5,
          550,
          160,
          80,
        );
      } else {
        ctx.font = "14pt MyFont";
        ctx.fillText(w1.group, 15, 595);
        ctx.font = "18pt MyFont";
      }
      ctx.textAlign = "right";
      ctx.fillText(w1.kills, 290, 600);
    }
    if (topWeapons.length >= 2) {
      const w2 = topWeapons[1];
      ctx.textAlign = "right";
      ctx.fillText(w2.kills, 290, 690);
      ctx.textAlign = "left";
      if (w2.image) {
        await loadImageAndDraw(
          ctx,
          `./img/weapons/${w2.image}`,
          5,
          640,
          160,
          80,
        );
      } else {
        ctx.font = "14pt MyFont";
        ctx.fillText(w2.group, 15, 685);
        ctx.font = "18pt MyFont";
      }
    }

    ctx.textAlign = "right";
    ctx.font = "15pt MyFont";
    ctx.fillText(roleTime1, 290, 327);
    ctx.fillText(roleTime2, 290, 422);

    ctx.textAlign = "left";
    ctx.fillStyle = "#95a6b9";
    ctx.fillText(time, 1171, 45);
    ctx.fillText(`${user.matches.matches} игр`, 1271, 45);
    ctx.fillText("Всего Убийств", 364, 188);
    ctx.fillText("Убийств на технике", 626, 188);
    ctx.fillText("У/С", 888, 188);
    ctx.fillText("% Побед", 1151, 188);
    ctx.textAlign = "center";
    ctx.fillText(exp.rankStr, 152, 68);
    ctx.textAlign = "left";
    ctx.fillText("Кит", 15, 275);
    ctx.fillText("Оружие", 15, 545);

    ctx.fillStyle = "#efefef";
    ctx.font = "20pt MyFont";
    ctx.fillText(user.kills.toString(), 364, 220);
    ctx.fillText(`${~~vehicleKills}`, 626, 220);
    ctx.fillText(user.kd.toString(), 888, 220);
    ctx.fillText(`${~~user.matches.winrate.toString()}%`, 1151, 220);

    ctx.fillText(user.matches.won.toString(), 532, 303);
    ctx.fillText(`${~~killPerMatch}`, 354, 303);
    ctx.fillText(user.revives.toString(), 709, 303);
    ctx.fillText(user.teamkills.toString(), 887, 303);
    ctx.fillText(user.death.toString(), 1065, 303);
    ctx.fillText(user.bonuses.toString(), 1242, 303);

    ctx.fillText(leader, 354, 384);
    ctx.fillText(cmd, 532, 384);
    ctx.fillText(heliTime, 709, 384);
    ctx.fillText(heavyTime, 887, 384);
    ctx.fillText(artillerySum || 0, 1065, 384);
    ctx.fillText(knifeSum, 1242, 384);

    ctx.fillStyle = "#95a6b9";
    ctx.font = "15pt MyFont";
    ctx.fillText("Побед", 532, 271);
    ctx.fillText("Убийст за игру", 354, 271);
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

    const colDeath = 1380;
    const colKills = 1300;
    const colKD = 1220;
    const colResult = 1100;
    const colTime = 950;

    ctx.fillText("Карта", 600, 525);
    ctx.fillText("Время", colTime, 525);
    ctx.fillText("Результат", colResult, 525);
    ctx.fillText("У/С", colKD, 525);
    await loadImageAndDraw(
      ctx,
      "./img/T_role_dead.png",
      colKills - 12,
      507,
      24,
      24,
    );
    await loadImageAndDraw(
      ctx,
      "./img/request_incap-1.png",
      colDeath - 12,
      507,
      24,
      24,
    );

    const history = user.matchHistory || [];
    const recentMatches = history.slice(-3).reverse();
    const historyYPositions = [565, 615, 665];
    const flagH = 34;
    const flagW = 45;

    for (let i = 0; i < recentMatches.length && i < 3; i++) {
      const match = recentMatches[i];
      const yPos = historyYPositions[i];
      const factions = parseFactions(match.layer);
      const rawLayer = match.layer || "";
      const cleanLayer = rawLayer.split(",")[0];
      const prettyLayer = cleanLayer
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      const mapName = prettyLayer || match.level || factions.map || "???";
      const displayText = mapName;
      const t1tickets = parseInt(match.team1?.tickets) || 0;
      const t2tickets = parseInt(match.team2?.tickets) || 0;
      const team1Won = t1tickets > t2tickets;
      const playerWon = match.result?.toLowerCase() === "won";
      const playerIsTeam1 = playerWon ? team1Won : !team1Won;
      const myFaction = playerIsTeam1 ? factions.team1 : factions.team2;
      const enemyFaction = playerIsTeam1 ? factions.team2 : factions.team1;
      const myTickets = playerIsTeam1 ? t1tickets : t2tickets;
      const enemyTickets = playerIsTeam1 ? t2tickets : t1tickets;

      let xCursor = 354;

      if (myFaction) {
        await loadImageAndDraw(
          ctx,
          `./img/${getFactionFlag(myFaction)}`,
          xCursor,
          yPos - flagH + 10,
          flagW,
          flagH,
        );
        xCursor += flagW + 8;
      }

      ctx.textAlign = "left";
      ctx.font = "14pt MyFont";
      const ticketStr = `${myTickets}:${enemyTickets}`;
      ctx.fillStyle = "#95a6b9";
      ctx.fillText(ticketStr, xCursor, yPos);
      xCursor += ctx.measureText(ticketStr).width + 6;

      if (enemyFaction) {
        await loadImageAndDraw(
          ctx,
          `./img/${getFactionFlag(enemyFaction)}`,
          xCursor,
          yPos - flagH + 10,
          flagW,
          flagH,
        );
        xCursor += flagW + 12;
      }

      ctx.fillStyle = "#efefef";
      ctx.font = "15pt MyFont";

      const maxMapWidth = colTime - xCursor - 20;
      let truncated = displayText;

      while (
        ctx.measureText(truncated).width > maxMapWidth &&
        truncated.length > 3
      ) {
        truncated = truncated.slice(0, -1);
      }

      if (truncated !== displayText) truncated += "…";

      ctx.fillText(truncated, xCursor, yPos);
      ctx.textAlign = "right";
      ctx.font = "15pt MyFont";
      ctx.fillStyle = "#95a6b9";
      ctx.fillText(
        getMatchDuration(match.startTime, match.endTime),
        colTime,
        yPos,
      );

      ctx.fillStyle = getResultColor(match.result);
      ctx.fillText(translateResult(match.result), colResult, yPos);
      ctx.fillStyle = "#efefef";
      ctx.fillText(match.kd?.toString() || "0", colKD, yPos);
      ctx.fillText(match.kills?.toString() || "0", colKills, yPos);
      ctx.fillText(match.death?.toString() || "0", colDeath, yPos);
    }

    ctx.textAlign = "left";
    ctx.fillStyle = "#efefef";
    ctx.font = "20pt MyFont";

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

    ctx.strokeStyle = "black";
    ctx.strokeRect(x0, y0, width1, height1);
    ctx.textAlign = "center";
    ctx.font = "17pt MyFont";
    ctx.fillStyle = "#efefef";
    ctx.fillText(exp.expProgress, 159, 170);

    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync("./stats.png", buffer);
    const imageToSend = new AttachmentBuilder("stats.png");
    interaction.editReply({ files: [imageToSend] });
  } catch (e) {
    console.log(e);
    await interaction.editReply({
      content: "Сыграно слишком мало игр для отображения статистики.",
      ephemeral: true,
    });
  } finally {
    await clientdb.close();
  }
}
export default getStatsOnDiscord;
