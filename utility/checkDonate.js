import fetch from "node-fetch";
import fs from "fs/promises";
import { MongoClient } from "mongodb";
import { EmbedBuilder } from "discord.js";
import creater from "./vip-creater.js";
import getSteamId64 from "./getSteamID64.js";
import clanVipManager from "./clanVipManager.js";
import options from "../config.js";

const { vipLogChannelId, vipAdminUserId } = options;

function toLatin(str) {
  const map = {
    а: "a",
    А: "A",
    в: "b",
    В: "B",
    е: "e",
    Е: "E",
    к: "k",
    К: "K",
    м: "m",
    М: "M",
    н: "h",
    Н: "H",
    о: "o",
    О: "O",
    р: "p",
    Р: "P",
    с: "c",
    С: "C",
    т: "t",
    Т: "T",
    у: "y",
    У: "Y",
    х: "x",
    Х: "X",
  };
  return str.replace(/[авекмнорстухАВЕКМНОРСТУХ]/g, (ch) => map[ch] || ch);
}

async function sendLogEmbed(channel, payload) {
  if (!channel) return;
  try {
    await channel.send(payload);
  } catch (err) {
    console.error("[vipDonate] Ошибка отправки сообщения в лог-канал:", err);
  }
}

async function main(guild, db, steamApi, donateUrl) {
  try {
    let logChannel = null;
    if (vipLogChannelId) {
      try {
        logChannel = await guild.channels.fetch(vipLogChannelId);
      } catch (err) {
        console.error(
          "[vipDonate] Не удалось получить vipLogChannelId из гильдии:",
          err,
        );
      }
    } else {
      console.warn(
        "[vipDonate] vipLogChannelId не задан в config.js — логирование в канал отключено.",
      );
    }

    const response = await fetch(donateUrl);
    const json = await response.json();

    const data = await fs.readFile(`./transaction/transactionId.json`, "utf-8");
    const transaction = JSON.parse(data);
    const existingIds = transaction.transactions.map((e) => e.id);

    // Получаем теги кланов из MongoDB
    const clanTags = await clanVipManager.getAllClanTags();

    for (const jsonEl of json.data) {
      const { id, what, comment, sum } = jsonEl;

      if (existingIds.includes(id.toString())) continue;

      const rawComment = (comment || "").trim();
      const lowerComment = rawComment.toLowerCase();
      const transl = toLatin(lowerComment);
      const tokens = transl.split(/\s+/);

      const baseEmbed = new EmbedBuilder()
        .setTitle("Новый донат (VIP)")
        .setColor(0x00aeff)
        .addFields(
          { name: "ID транзакции", value: String(id), inline: true },
          { name: "От", value: what || "—", inline: true },
          { name: "Сумма", value: `${sum}₽`, inline: true },
          {
            name: "Комментарий",
            value: rawComment && rawComment.length > 0 ? rawComment : "—",
          },
        )
        .setTimestamp();

      await sendLogEmbed(logChannel, { embeds: [baseEmbed] });

      // Ищем клановый тег в комментарии
      const commentTag = tokens.find((tok) => clanTags.includes(tok));

      if (commentTag) {
        // ═══════════════════════════════════════
        // КЛАНОВЫЙ ДОНАТ
        // ═══════════════════════════════════════
        const slotOrderResult = await clanVipManager.processPendingSlotOrder(
          commentTag,
          sum,
        );

        if (slotOrderResult.applied) {
          const slotEmbed = new EmbedBuilder()
            .setTitle("Слоты клана увеличены")
            .setColor(0x00ff00)
            .setDescription(
              `Найден ожидающий запрос на увеличение слотов для клана \`${commentTag}\`.\n` +
                `Донат обработан как **увеличение слотов**, а не продление VIP.\n` +
                `Слоты: **${slotOrderResult.oldSlots} → ${slotOrderResult.newSlots}**\n` +
                `Добавлено слотов: **${slotOrderResult.extraSlots}**\n` +
                `Сумма: **${sum}₽**`,
            )
            .addFields(
              { name: "ID транзакции", value: String(id), inline: true },
              { name: "От", value: what || "—", inline: true },
              { name: "Тег клана", value: String(commentTag), inline: true },
            )
            .setTimestamp();

          await sendLogEmbed(logChannel, { embeds: [slotEmbed] });

          transaction.transactions.push({
            id: `${id}`,
            username: what,
            clan: commentTag,
            type: "clan_slot_expand",
            sum,
            oldSlots: slotOrderResult.oldSlots,
            newSlots: slotOrderResult.newSlots,
            extraSlots: slotOrderResult.extraSlots,
            pendingSlotOrderId: String(slotOrderResult.order._id),
          });
          await fs.writeFile(
            `./transaction/transactionId.json`,
            JSON.stringify(transaction, null, 2),
            "utf-8",
          );
          continue;
        }

        const result = await clanVipManager.processClanDonation(
          commentTag,
          sum,
        );

        if (!result.found) {
          console.log(`Клан "${commentTag}" не найден в базе данных!`);

          const errorEmbed = new EmbedBuilder()
            .setTitle("Проблема с клановым донатом (VIP)")
            .setColor(0xff0000)
            .setDescription(
              `Клан по тегу \`${commentTag}\` не найден в базе данных.\nКомментарий: \`${rawComment || "—"}\``,
            )
            .addFields(
              { name: "ID транзакции", value: String(id), inline: true },
              { name: "От", value: what || "—", inline: true },
              { name: "Сумма", value: `${sum}₽`, inline: true },
            )
            .setTimestamp();

          await sendLogEmbed(logChannel, {
            content: vipAdminUserId ? `<@${vipAdminUserId}>` : undefined,
            embeds: [errorEmbed],
          });

          transaction.transactions.push({
            id: `${id}`,
            username: what,
            clan: commentTag,
            error: "CLAN_NOT_FOUND",
            comment: rawComment,
          });
          await fs.writeFile(
            `./transaction/transactionId.json`,
            JSON.stringify(transaction, null, 2),
            "utf-8",
          );
          continue;
        }

        // Формируем читаемую дату
        const newDateStr = clanVipManager.formatDateRu(result.newExpires);
        const oldDateStr = clanVipManager.formatDateRu(result.oldExpires);

        if (result.totalMembers === 0) {
          console.log(
            `Клан "${commentTag}" найден, но не содержит участников!`,
          );

          const errorEmbed = new EmbedBuilder()
            .setTitle("Проблема с клановым донатом (VIP)")
            .setColor(0xffaa00)
            .setDescription(
              `Клан по тегу \`${commentTag}\` найден, но в нём нет участников.\n` +
                `VIP клана обновлён до **${newDateStr}**, но роли никому не выданы.\n` +
                `Слотов: **${result.slots}** | Цена/мес: **${result.pricePerMonth}₽**\n` +
                `Начислено дней: **${result.daysAdded.toFixed(1)}**\n` +
                `Комментарий: \`${rawComment || "—"}\``,
            )
            .addFields(
              { name: "ID транзакции", value: String(id), inline: true },
              { name: "От", value: what || "—", inline: true },
              { name: "Сумма", value: `${sum}₽`, inline: true },
            )
            .setTimestamp();

          await sendLogEmbed(logChannel, {
            content: vipAdminUserId ? `<@${vipAdminUserId}>` : undefined,
            embeds: [errorEmbed],
          });

          // Обновляем Admins.cfg для синхронизации с игровым сервером
          try {
            await clanVipManager.triggerAdminsCfgRegen();
          } catch (e) {
            console.error("[vipDonate] triggerAdminsCfgRegen error:", e);
          }

          transaction.transactions.push({
            id: `${id}`,
            username: what,
            clan: commentTag,
            error: "CLAN_EMPTY",
            slots: result.slots,
            daysAdded: result.daysAdded,
            newDate: newDateStr,
          });
          await fs.writeFile(
            `./transaction/transactionId.json`,
            JSON.stringify(transaction, null, 2),
            "utf-8",
          );
          continue;
        }

        // Обновляем Admins.cfg
        // 1. Обновляем локальный Admins.cfg и получаем discordIds
        let cfgResult = { updated: false, discordIds: [] };

        try {
          cfgResult = await clanVipManager.updateClanInAdminsCfg(
            commentTag,
            newDateStr,
          );
        } catch (e) {
          console.error("[vipDonate] Ошибка updateClanInAdminsCfg:", e);
        }

        // 2. Синхронизируем с сервером (API)
        try {
          await clanVipManager.triggerAdminsCfgRegen();
        } catch (e) {
          console.error("[vipDonate] Ошибка triggerAdminsCfgRegen:", e);
        }

        // 3. Discord IDs из cfg
        const cfgDiscordIds =
          cfgResult && cfgResult.updated ? cfgResult.discordIds : [];
        // Также добавляем discordIds из MongoDB (members.addedBy)
        const allDiscordIds = [
          ...new Set([...cfgDiscordIds, ...result.discordIds]),
        ];

        const vipRole = guild.roles.cache.find((r) => r.name === "VIP");
        const mentions = [];

        for (const discordId of allDiscordIds) {
          try {
            const discordUser = await guild.members.fetch(discordId);
            if (vipRole && discordUser) {
              await discordUser.roles.add(vipRole);
            }
            mentions.push(`<@${discordId}>`);
          } catch (error) {
            console.log("Ошибка при выдаче роли юзеру:", discordId, error);
          }
        }

        const title = result.isExtension
          ? "Клановый VIP продлён"
          : "Клановый VIP выдан";

        const description = result.isExtension
          ? `Получен клановый донат на VIP — **продление**.\n` +
            `Тег клана: \`${commentTag}\`\n` +
            `Слотов: **${result.slots}** | Цена/мес: **${result.pricePerMonth}₽**\n` +
            `Начислено дней: **${result.daysAdded.toFixed(1)}**\n` +
            `Старая дата: **${oldDateStr}** → Новая дата: **${newDateStr}**` +
            (result.totalMembers > allDiscordIds.length
              ? `\n⚠️ У ${result.totalMembers - allDiscordIds.length} из ${result.totalMembers} участников не указан DiscordID — роль им не выдана.`
              : "")
          : `Получен клановый донат на VIP — **новый/возобновлённый**.\n` +
            `Тег клана: \`${commentTag}\`\n` +
            `Слотов: **${result.slots}** | Цена/мес: **${result.pricePerMonth}₽**\n` +
            `Начислено дней: **${result.daysAdded.toFixed(1)}**\n` +
            `Срок: до **${newDateStr}**` +
            (result.totalMembers > allDiscordIds.length
              ? `\n⚠️ У ${result.totalMembers - allDiscordIds.length} из ${result.totalMembers} участников не указан DiscordID — роль им не выдана.`
              : "");

        const clanEmbed = new EmbedBuilder()
          .setTitle(title)
          .setColor(0x00ff00)
          .setDescription(description)
          .addFields(
            { name: "ID транзакции", value: String(id), inline: true },
            { name: "От", value: what || "—", inline: true },
            { name: "Сумма", value: `${sum}₽`, inline: true },
            {
              name: "Участники (Discord)",
              value: mentions.length
                ? mentions.join(", ")
                : "Нет участников с DiscordID",
            },
          )
          .setTimestamp();

        await sendLogEmbed(logChannel, { embeds: [clanEmbed] });

        transaction.transactions.push({
          id: `${id}`,
          username: what,
          clan: commentTag,
          slots: result.slots,
          pricePerMonth: result.pricePerMonth,
          daysAdded: result.daysAdded,
          isExtension: result.isExtension,
          discordIds: allDiscordIds,
          totalMembers: result.totalMembers,
          newDate: newDateStr,
        });
        await fs.writeFile(
          `./transaction/transactionId.json`,
          JSON.stringify(transaction, null, 2),
          "utf-8",
        );
        continue;
      }

      // ═══════════════════════════════════════
      // ПЕРСОНАЛЬНЫЙ ДОНАТ (Steam VIP)
      // ═══════════════════════════════════════
      const hasSteamInfo =
        lowerComment.includes("steamcommunity") ||
        !!lowerComment.match(/\b[0-9]{17}\b/);

      if (!hasSteamInfo) {
        const errorEmbed = new EmbedBuilder()
          .setTitle("Проблема с донатом (VIP)")
          .setColor(0xff0000)
          .setDescription(
            "В донате не найден SteamID и ссылка на steamcommunity. VIP не выдан.",
          )
          .addFields(
            { name: "ID транзакции", value: String(id), inline: true },
            { name: "От", value: what || "—", inline: true },
            { name: "Сумма", value: `${sum}₽`, inline: true },
            {
              name: "Комментарий",
              value: rawComment && rawComment.length > 0 ? rawComment : "—",
            },
          )
          .setTimestamp();

        await sendLogEmbed(logChannel, {
          content: vipAdminUserId ? `<@${vipAdminUserId}>` : undefined,
          embeds: [errorEmbed],
        });

        transaction.transactions.push({
          id: `${id}`,
          username: what,
          comment: rawComment,
          error: "NO_STEAM_INFO",
        });
        await fs.writeFile(
          `./transaction/transactionId.json`,
          JSON.stringify(transaction, null, 2),
          "utf-8",
        );
        continue;
      }

      const steamId = await getSteamId64(steamApi, comment);
      if (steamId) {
        const clientdb = new MongoClient(db);
        const dbName = "SquadJS";
        const dbCollection = "mainstats";
        let discordID;

        try {
          await clientdb.connect();
          const dbConn = clientdb.db(dbName);
          const collection = dbConn.collection(dbCollection);
          const user = await collection.findOne({ _id: steamId });
          if (user) {
            discordID = user.discordid || user.telegramid;
          }
        } catch (e) {
          console.error(e);
        } finally {
          await clientdb.close().catch(() => {});
        }

        const result = await creater.vipCreater(steamId, what, sum, discordID);

        transaction.transactions.push({
          id: `${id}`,
          username: what,
          steamID: steamId,
        });

        await fs.writeFile(
          `./transaction/transactionId.json`,
          JSON.stringify(transaction, null, 2),
          "utf-8",
        );

        let discordMention = "—";
        if (discordID) {
          discordMention = `<@${discordID}>`;
          try {
            const discordUser = await guild.members.fetch(discordID);
            const vipRole = guild.roles.cache.find(
              (role) => role.name === "VIP",
            );
            if (vipRole && discordUser) {
              await discordUser.roles.add(vipRole);
            }
          } catch (error) {
            console.log("Ошибка при выдаче роли пользователю:", discordID);
          }
        }

        if (result && result.newVipEndDate) {
          const { isExtension, oldVipEndDate, newVipEndDate, daysToAdd } =
            result;

          const title = isExtension
            ? "VIP продлён"
            : "VIP выдан новому пользователю";

          const description = isExtension
            ? `VIP продлён на **${daysToAdd.toFixed(
                2,
              )}** дней.\nС **${oldVipEndDate.toLocaleDateString(
                "ru-RU",
              )}** по **${newVipEndDate.toLocaleDateString("ru-RU")}**.`
            : `VIP выдан на **${daysToAdd.toFixed(
                0,
              )}** дней.\nДата окончания: **${newVipEndDate.toLocaleDateString(
                "ru-RU",
              )}**.`;

          const vipEmbed = new EmbedBuilder()
            .setTitle(title)
            .setColor(0x00ff00)
            .setDescription(description)
            .addFields(
              { name: "SteamID", value: steamId, inline: true },
              { name: "Discord", value: discordMention, inline: true },
              { name: "От", value: what || "—", inline: true },
              { name: "Сумма", value: `${sum}₽`, inline: true },
            )
            .setTimestamp();

          await sendLogEmbed(logChannel, { embeds: [vipEmbed] });
        } else {
          const warnEmbed = new EmbedBuilder()
            .setTitle("Проблема с выдачей VIP")
            .setColor(0xff0000)
            .setDescription(
              "vipCreater не вернул ожидаемый результат. Проверь лог.",
            )
            .addFields(
              { name: "SteamID", value: steamId, inline: true },
              {
                name: "Discord",
                value: discordID ? `<@${discordID}>` : "—",
                inline: true,
              },
              { name: "От", value: what || "—", inline: true },
              { name: "Сумма", value: `${sum}₽`, inline: true },
            )
            .setTimestamp();

          await sendLogEmbed(logChannel, {
            content: vipAdminUserId ? `<@${vipAdminUserId}>` : undefined,
            embeds: [warnEmbed],
          });
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

export default main;
