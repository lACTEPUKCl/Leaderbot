import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const JOIN_PATH = "/api/join-link";
const REFRESH_MS = Number(process.env.REFRESH_MS || 30000);

let SERVERS = [];

export async function initLobbyButtons(
  client,
  channelId,
  _steamApiKeyNotUsed,
  domain
) {
  try {
    SERVERS = JSON.parse(process.env.SERVERS_CONFIG || "[]");

    if (!Array.isArray(SERVERS) || !SERVERS.length) {
      throw new Error("SERVERS_CONFIG empty or not array");
    }

    for (const srv of SERVERS) {
      if (!srv || typeof srv.name !== "string" || !srv.name.trim()) {
        throw new Error("Each server must have non-empty 'name' field");
      }
    }
  } catch (err) {
    console.error(
      "ERROR: SERVERS_CONFIG must be valid JSON array of { name, label? }",
      err
    );
    process.exit(1);
  }

  if (!domain) {
    console.error(
      "ERROR: domain is required (used to build http redirect links)"
    );
    process.exit(1);
  }

  const channel = await client.channels.fetch(channelId);
  const controlMsg = await findOrCreateMessage(channel);

  await editMessage(controlMsg, domain);

  setInterval(async () => {
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

  for (const srv of SERVERS) {
    const fullName = (srv.name || "").trim();
    if (!fullName) continue;

    const label = (srv.label || fullName || "").trim();
    if (!label) continue;

    const encodedName = encodeURIComponent(fullName);
    const url = `http://${domain}${JOIN_PATH}?name=${encodedName}`;

    row.addComponents(
      new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(url)
    );
  }

  return row;
}
