import fs from "fs/promises";
import options from "../config.js";

const adminsCfgPath = options.adminsCfgPath || "./";
const CLAN_BLOCK_START =
  /^\/\/CLAN\s+\[([^\]\*]+)(\*?)]\s+(\d+)\s+do\s+(\d{2}\.\d{2}\.\d{4})/;
const CLAN_BLOCK_START_ANY = /^\/\/CLAN\s+\[([^\]]+)]/;
const CLAN_BLOCK_END = /^\/\/END/;
0;
const MEMBER_LINE =
  /^\/?\/?Admin=(\d+):ClanVip\s*\/\/ DiscordID (\d+).*do\s+(\d{2}\.\d{2}\.\d{4})/;

export async function parseClansFile(path = adminsCfgPath + "Admins.cfg") {
  const data = await fs.readFile(path, "utf-8");
  const lines = data.split(/\r?\n/);

  const clans = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m = line.match(CLAN_BLOCK_START);

    if (m) {
      if (current) clans.push(current);
      current = {
        header: line,
        headerIdx: i,
        lines: [],
        endIdx: null,
        active: !m[2],
        tag: m[1],
        star: !!m[2],
        clanDiscordId: m[3],
        until: m[4],
        members: [],
      };
      continue;
    }
    if (CLAN_BLOCK_END.test(line)) {
      if (current) {
        current.endIdx = i;
        clans.push(current);
        current = null;
      }
      continue;
    }
    if (current) {
      current.lines.push({ value: line, idx: i });
      const mem = line.match(MEMBER_LINE);
      if (mem) {
        current.members.push({
          raw: line,
          commented: line.trim().startsWith("//"),
          steamId: mem[1],
          discordId: mem[2],
          until: mem[3],
          idx: i,
        });
      }
    }
  }
  return { lines, clans };
}

export async function updateClan(tag, addDays = 30) {
  const { lines, clans } = await parseClansFile();
  const now = new Date();
  const newDate = formatDate(addDaysFromNow(now, addDays));
  let clan = clans.find(
    (c) => c.tag.trim().toLowerCase() === tag.trim().toLowerCase()
  );
  if (!clan) return [];

  let headerLine = clan.header.replace(/\[([^\]\*]+)\*\]/, "[$1]");
  headerLine = headerLine.replace(/do\s+\d{2}\.\d{2}\.\d{4}/, `do ${newDate}`);
  lines[clan.headerIdx] = headerLine;

  for (const m of clan.members) {
    let newVal = m.raw.replace(/^\/\//, "");
    newVal = newVal.replace(/do\s+\d{2}\.\d{2}\.\d{4}/, `do ${newDate}`);
    lines[m.idx] = newVal;
  }
  await fs.writeFile(adminsCfgPath + "Admins.cfg", lines.join("\r\n"), "utf-8");
  return clan.members.map((m) => m.discordId);
}

export async function freezeClan(tag) {
  const { lines, clans } = await parseClansFile();
  let clan = clans.find(
    (c) => c.tag.trim().toLowerCase() === tag.trim().toLowerCase()
  );
  if (!clan) return [];

  let headerLine = clan.header.replace(/\[([^\]\*]+)]/, "[$1*]");
  lines[clan.headerIdx] = headerLine;

  for (const m of clan.members) {
    if (!m.raw.trim().startsWith("//")) lines[m.idx] = "//" + m.raw;
  }
  await fs.writeFile(adminsCfgPath + "Admins.cfg", lines.join("\r\n"), "utf-8");
  return clan.members.map((m) => m.discordId);
}

function addDaysFromNow(date, days) {
  let d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function formatDate(date) {
  return date
    .toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, ".");
}

export async function getActiveClans() {
  const { clans } = await parseClansFile();
  return clans.filter((c) => c.active);
}

export async function getClanMemberDiscordIds(tag) {
  const { clans } = await parseClansFile();
  let clan = clans.find(
    (c) => c.tag.trim().toLowerCase() === tag.trim().toLowerCase()
  );
  if (!clan) return [];
  return clan.members.map((m) => m.discordId);
}

export default {
  parseClansFile,
  updateClan,
  freezeClan,
  getActiveClans,
  getClanMemberDiscordIds,
};
