import dayjs from "dayjs";
import clanVipManager from "./clanVipManager.js";
import options from "../config.js";

const { vipRoleID, vipRoleName, vipExpiredMessage } = options;

export async function clanVipCleaner(guild) {
  const { clans } = await clanVipManager.parseClansFile();
  const today = dayjs();

  for (const clan of clans) {
    if (!clan.active) continue;

    const [d, m, y] = clan.until.split(".");
    const endDate = dayjs(`${y}-${m}-${d}`);
    if (endDate.isBefore(today, "day")) {
      const discordIds = await clanVipManager.freezeClan(clan.tag);
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
        } catch (e) {}
      }
    }
  }
}

export default clanVipCleaner;
