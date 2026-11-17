import { MongoClient } from "mongodb";
import { ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import jwt from "jsonwebtoken";
import { donationDiscordName, prepareDonationLink } from "./donationLinkAudit.js";
import options from "../config.js";

const { donationLink } = options;

async function donateInteraction(interaction, db) {
  await interaction.deferReply({ ephemeral: true });

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
    const matches = await collection.find({ discordid: discordId }, { projection: { _id: 1 } }).limit(2).toArray();
    if (matches.length > 1) {
      await interaction.editReply({
        content: "К вашему Discord привязано несколько SteamID. Обратитесь к администратору для уточнения привязки.",
        ephemeral: true,
      });
      return;
    }
    const user = matches[0];

    if (!user) {
      if (!LINK_STEAM_URL || !LINK_SIGN_SECRET) {
        console.error(
          "[donateInteraction] Нет LINK_STEAM_URL или LINK_SIGN_SECRET в окружении"
        );
        await interaction.editReply({
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

      const linkButton = new ButtonBuilder()
        .setLabel("Привязать Steam через сайт")
        .setStyle(ButtonStyle.Link)
        .setURL(url);

      const row = new ActionRowBuilder().addComponents(linkButton);

      await interaction.editReply({
        content:
          "Ваш Discord ещё не привязан к Steam.\n" +
          "Нажмите кнопку ниже — откроется сайт, где нужно войти через Steam для привязки.\n" +
          "После привязки можно будет оформить донат с вашим SteamID.",
        ephemeral: true,
        components: [row],
      });
      return;
    }

    const steamId = user._id;

    if (typeof steamId !== 'string' || !/^7656119\d{10}$/.test(steamId)) {
      await interaction.editReply({
        content:
          "В базе найден пользователь с вашим Discord, но без SteamID. Обратитесь к администратору.",
        ephemeral: true,
      });
      return;
    }

    const prepared = await prepareDonationLink(database, {
      platform: "discord", actorId: discordId, steamId,
      configuredUrl: donationLink, discordName: donationDiscordName(interaction),
    });
    const donateButton = new ButtonBuilder()
      .setLabel("Поддержать проект")
      .setStyle(ButtonStyle.Link)
      .setURL(prepared.url);

    const donateRow = new ActionRowBuilder().addComponents(donateButton);
    const instructions = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle("⚠️ Перед оплатой обязательно проверьте данные")
      .setDescription(
        "В поле **«Сообщение стримеру»** на DonatePay должен быть **только ваш SteamID**.\n\n" +
        "Если поле пустое или указан другой ID, очистите его и вставьте свой SteamID из этого сообщения."
      )
      .addFields({ name: "Ваш SteamID", value: `\`\`\`\n${steamId}\n\`\`\`` });

    await interaction.editReply({
      content: "",
      embeds: [instructions],
      components: [donateRow],
      ephemeral: true,
    });
    await prepared.delivered();
  } catch (e) {
    console.error("[donateInteraction] Ошибка:", e);
    try {
      await interaction.editReply({
        content: "Произошла ошибка при подготовке ссылки на донат.",
        ephemeral: true,
      });
    } catch {}
  } finally {
    await clientdb.close().catch(() => {});
  }
}

export default donateInteraction;
