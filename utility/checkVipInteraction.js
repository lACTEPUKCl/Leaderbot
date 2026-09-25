// utils/checkVipInteraction.js
import { MongoClient } from "mongodb";
import { config as loadEnv } from "dotenv";

loadEnv();

const DB_URL = process.env.DATABASE_URL || process.env.MONGO_URL;
const DB_NAME = "SquadJS";
const DB_COLLECTION = "mainstats";

async function checkVipInteraction(interaction, _adminsCfgPath) {
  await interaction.deferReply({ ephemeral: true });

  if (!DB_URL) {
    console.error("[checkVipInteraction] Не задан DATABASE_URL / MONGO_URL");
    await interaction.editReply({
      content: "Ошибка конфигурации сервера. Обратитесь к администрации.",
      ephemeral: true,
    });
    return;
  }

  const client = new MongoClient(DB_URL);
  const discordId = interaction.user.id;

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(DB_COLLECTION);

    // Ищем пользователя по discordid
    const user = await collection.findOne({ discordid: discordId });

    if (!user || !user.vipEndDate || !(user.vipEndDate instanceof Date)) {
      await interaction.editReply({
        content: "VIP статус отсутствует или срок действия истёк.",
        ephemeral: true,
      });
      return;
    }

    const now = new Date();
    const vipEndDate = user.vipEndDate;

    if (vipEndDate <= now) {
      await interaction.editReply({
        content: "Срок действия VIP статуса истёк.",
        ephemeral: true,
      });
      return;
    }

    const msLeft = vipEndDate.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

    const dd = String(vipEndDate.getDate()).padStart(2, "0");
    const mm = String(vipEndDate.getMonth() + 1).padStart(2, "0");
    const yyyy = vipEndDate.getFullYear();
    const dateStr = `${dd}.${mm}.${yyyy}`;

    let text = `Дата окончания VIP статуса — ${dateStr}`;
    if (daysLeft > 0) {
      text += `\nОсталось дней: ${daysLeft}`;
    }

    await interaction.editReply({
      content: text,
      ephemeral: true,
    });
  } catch (err) {
    console.error("[checkVipInteraction] Ошибка:", err);
    try {
      await interaction.editReply({
        content: "Произошла ошибка при проверке VIP статуса. Попробуйте позже.",
        ephemeral: true,
      });
    } catch {}
  } finally {
    await client.close().catch(() => {});
  }
}

export default checkVipInteraction;
