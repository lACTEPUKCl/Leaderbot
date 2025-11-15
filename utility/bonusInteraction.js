import { MongoClient } from "mongodb";
import creater from "./vip-creater.js";
import { ButtonBuilder, ActionRowBuilder, ButtonStyle } from "discord.js";
import options from "../config.js";
import jwt from "jsonwebtoken";

async function updateUserBonuses(collection, steamID, count) {
  if (!steamID || !count) return;

  const user = { _id: steamID };
  const doc = {
    $inc: {
      bonuses: count,
    },
  };

  await collection.updateOne(user, doc);
}

async function bonusInteraction(interaction, db) {
  const clientdb = new MongoClient(db);
  const dbName = "SquadJS";
  const dbCollection = "mainstats";
  const discordId = interaction.user.id;
  const LINK_STEAM_URL = process.env.LINK_STEAM_URL;
  const LINK_SIGN_SECRET = process.env.LINK_SIGN_SECRET;

  try {
    await clientdb.connect();
    const database = clientdb.db(dbName);
    const collection = database.collection(dbCollection);
    const dbUser = await collection.findOne({
      discordid: discordId,
    });

    if (!dbUser) {
      if (!LINK_STEAM_URL || !LINK_SIGN_SECRET) {
        console.error(
          "[bonusInteraction] Нет LINK_STEAM_URL или LINK_SIGN_SECRET в окружении"
        );
        await interaction.reply({
          content:
            "Система привязки Steam через сайт сейчас недоступна. Сообщите администратору.",
          ephemeral: true,
        });
        return;
      }

      const token = jwt.sign({ discordId }, LINK_SIGN_SECRET, {
        algorithm: "HS256",
        expiresIn: "30m",
      });

      let url = LINK_STEAM_URL;
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}token=${encodeURIComponent(token)}`;

      const confirm = new ButtonBuilder()
        .setLabel("Привязать Steam через сайт")
        .setStyle(ButtonStyle.Link)
        .setURL(url);

      const row = new ActionRowBuilder().addComponents(confirm);

      await interaction.reply({
        content:
          "Ваш Discord ещё не привязан к Steam.\n" +
          "Нажмите кнопку ниже — откроется сайт, где нужно войти через Steam для привязки.\n" +
          "После привязки вы сможете потратить бонусные баллы на VIP статус.",
        ephemeral: true,
        components: [row],
      });
      return;
    }

    const { bonuses, _id, name } = dbUser;

    if (!_id) {
      await interaction.reply({
        content:
          "В базе найден пользователь с вашим Discord, но без SteamID. Обратитесь к администратору.",
        ephemeral: true,
      });
      return;
    }

    if (!bonuses || bonuses < 15000) {
      const current = bonuses || 0;
      const changeBonuses = Math.abs(15000 - current);
      await interaction.reply({
        content: `Не хватает ${changeBonuses} бонусных баллов для получения VIP статуса, требуется 15000 бонусных баллов.`,
        ephemeral: true,
      });
      return;
    }

    await updateUserBonuses(collection, _id, -15000);

    try {
      const member = await interaction.guild.members.fetch(discordId);

      let vipRole =
        interaction.guild.roles.cache.find(
          (r) => r.name === options.vipRoleName
        ) ||
        (options.vipRoleID &&
          (await interaction.guild.roles.fetch(options.vipRoleID)));

      if (vipRole) {
        await member.roles.add(vipRole);
      } else {
        console.warn(
          "[bonusInteraction] Не найдена роль VIP по имени/ID, проверь vipRoleName/vipRoleID в config.js"
        );
      }
    } catch (err) {
      console.log("[bonusInteraction] Ошибка при выдаче роли VIP:", err);
    }

    await creater.vipCreater(_id, name, 300, discordId);

    await interaction.reply({
      content: `VIP статус успешно получен, можно проверить состояние, нажав кнопку проверки VIP!`,
      ephemeral: true,
    });
  } catch (e) {
    console.error("[bonusInteraction] Ошибка:", e);
    try {
      await interaction.reply({
        content: "Произошла ошибка при попытке выдать VIP статус.",
        ephemeral: true,
      });
    } catch {}
  } finally {
    await clientdb.close().catch(() => {});
  }
}

export default bonusInteraction;
