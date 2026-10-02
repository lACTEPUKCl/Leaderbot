import { MongoClient } from "mongodb";
import { ButtonBuilder, ActionRowBuilder, ButtonStyle } from "discord.js";
import jwt from "jsonwebtoken";
import { prepareDonationLink } from "./donationLinkAudit.js";
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
    const user = await collection.findOne({ discordid: discordId });

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

    if (!steamId) {
      await interaction.editReply({
        content:
          "В базе найден пользователь с вашим Discord, но без SteamID. Обратитесь к администратору.",
        ephemeral: true,
      });
      return;
    }

    const prepared = await prepareDonationLink(database, { platform: "discord", actorId: discordId, steamId, configuredUrl: donationLink });
    const donateButton = new ButtonBuilder()
      .setLabel("Оформить донат")
      .setStyle(ButtonStyle.Link)
      .setURL(prepared.url);

    const donateRow = new ActionRowBuilder().addComponents(donateButton);

    await interaction.editReply({
      content: `Ваш SteamID: **${steamId}**\nСкопируйте его. На DonatePay полностью очистите поле «Сообщение стримеру» и вставьте этот SteamID. Перед оплатой проверьте: в поле должен быть только ваш ID. Сайт может показывать чужой ID — не оставляйте его.`,
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
