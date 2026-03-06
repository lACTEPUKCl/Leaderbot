import clanVipManager from "./clanVipManager.js";
import options from "../config.js";

const { vipRoleID, vipRoleName, vipExpiredMessage } = options;

export async function clanVipCleaner(guild) {
  try {
    // Получаем кланы с истёкшим VIP из MongoDB
    const expiredClans = await clanVipManager.getExpiredClans();

    for (const clan of expiredClans) {
      const tag = clan.tag;
      console.log(
        `[clanVipCleaner] Клан "${tag}" — VIP истёк (${clan.expiresAt?.toISOString()}). Замораживаем в Admins.cfg.`
      );

      // Замораживаем в Admins.cfg (комментируем строки, добавляем звёздочку)
      const discordIds = await clanVipManager.freezeClan(tag);

      for (const userId of discordIds) {
        try {
          const member = await guild.members.fetch(userId);
          if (!member) continue;

          let role =
            guild.roles.cache.find((r) => r.name === vipRoleName) ||
            (vipRoleID && (await guild.roles.fetch(vipRoleID)));

          if (!role) continue;

          await member.roles.remove(role);
          await member
            .send(vipExpiredMessage)
            .catch(() =>
              console.log(
                `[clanVipCleaner] Не удалось отправить сообщение ${userId}`
              )
            );
        } catch (e) {
          console.error(
            `[clanVipCleaner] Ошибка при обработке участника ${userId}:`,
            e
          );
        }
      }
    }

    if (expiredClans.length === 0) {
      console.log("[clanVipCleaner] Нет кланов с истёкшим VIP.");
    }
  } catch (err) {
    console.error("[clanVipCleaner] Общая ошибка:", err);
  }
}

export default clanVipCleaner;
