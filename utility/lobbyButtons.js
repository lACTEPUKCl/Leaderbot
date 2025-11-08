import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import fs from "node:fs/promises";

const LOBBY_FILE = process.env.LOBBY_FILE || "/app/lobby-map.json";
const JOIN_PATH = "/api/join-link";

const REFRESH_MS = +(process.env.REFRESH_MS || 30000);

let SERVERS = [];
let LOBBY_CACHE = null;

export async function initLobbyButtons(
  client,
  channelId,
  _steamApiKeyNotUsed,
  domain
) {
  try {
    SERVERS = JSON.parse(process.env.SERVERS_CONFIG || "[]");
    if (!Array.isArray(SERVERS) || !SERVERS.length) {
      throw new Error("SERVERS_CONFIG empty");
    }
  } catch (err) {
    console.error(
      "ERROR: SERVERS_CONFIG must be valid JSON array of {key,label}",
      err
    );
    process.exit(1);
  }

  if (!domain) {
    console.error(
      "ERROR: domain is required (used to build https redirect links)"
    );
    process.exit(1);
  }

  const channel = await client.channels.fetch(channelId);
  const controlMsg = await findOrCreateMessage(channel);

  await updateFromLobbyMap();
  await editMessage(controlMsg, domain);

  setInterval(async () => {
    await updateFromLobbyMap();
    await editMessage(controlMsg, domain);
  }, REFRESH_MS);
}

async function findOrCreateMessage(channel) {
  const fetched = await channel.messages.fetch({ limit: 50 });
  const existing = fetched.find(
    (m) => m.author.id === channel.client.user.id && m.components.length
  );
  if (existing) return existing;

  return channel.send({
    content: [
      "**Как подключиться к серверу Squad:**",
      "1) Запустите игру **Squad**.",
      "2) Нажмите на кнопку нужного сервера ниже.",
    ].join("\n"),
  });
}

async function readLobbyMapSafe() {
  try {
    const raw = await fs.readFile(LOBBY_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function updateFromLobbyMap() {
  const data = await readLobbyMapSafe();
  if (!data || !data.servers) return;
  LOBBY_CACHE = data;
}

async function editMessage(msg, domain) {
  const row = buildRow(domain);
  const rowData = row.toJSON();
  if (rowData.components.length) {
    await msg.edit({ components: [row] });
  } else {
    await msg.edit({ components: [] });
  }
}

function buildRow(domain) {
  const row = new ActionRowBuilder();

  if (!SERVERS || !SERVERS.length) return row;
  if (!LOBBY_CACHE || !LOBBY_CACHE.servers) return row;

  const serversMap = LOBBY_CACHE.servers;

  for (const srv of SERVERS) {
    const rec = serversMap[srv.key];
    if (!rec) continue;

    const fullName = (rec.name || "").trim();
    if (!fullName) continue;

    const label = (srv.label || fullName || srv.key || "").trim();
    if (!label) continue;

    const searchName = fullName;

    const encodedName = encodeURIComponent(searchName);
    const url = `http://${domain}${JOIN_PATH}?name=${encodedName}`;

    row.addComponents(
      new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(url)
    );
  }

  return row;
}
