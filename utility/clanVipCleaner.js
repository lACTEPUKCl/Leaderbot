import clanVipManager from "./clanVipManager.js";
import options from "../config.js";

const { vipRoleID, vipRoleName, vipExpiredMessage } = options;

export async function clanVipCleaner(guild) {
  try {
    const expiredClans = await clanVipManager.getExpiredClans();
    let needsRegen = false;

    for (const clan of expiredClans) {
      const tag = clan.tag;
      console.log(`[clanVipCleaner] Клан "${tag}" — VIP истёк.`);
      needsRegen = true;

      const discordIds = await clanVipManager.getClanMemberDiscordIds(tag);

      for (const userId of discordIds) {
        try {
          const member = await guild.members.fetch(userId);
          if (!member) continue;
          let role =
            guild.roles.cache.find((r) => r.name === vipRoleName) ||
            (vipRoleID && (await guild.roles.fetch(vipRoleID)));
          if (!role) continue;
          await member.roles.remove(role);
          await member.send(vipExpiredMessage).catch(() => {});
        } catch (e) {
          console.error(`[clanVipCleaner] Ошибка: ${userId}`, e);
        }
      }
    }

    if (needsRegen) {
      await clanVipManager.triggerAdminsCfgRegen();
    }

    if (expiredClans.length === 0) {
      console.log("[clanVipCleaner] Нет кланов с истёкшим VIP.");
    }
  } catch (err) {
    console.error("[clanVipCleaner] Общая ошибка:", err);
  }
}

export default clanVipCleaner;
