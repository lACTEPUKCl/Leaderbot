import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const JOIN_PATH = "/api/join-link";
const REFRESH_MS = Number(process.env.REFRESH_MS || 30000);

const SERVERS = [
  {
    label: "RNS #1 Classic",
    name: "  [ RU ] Русский Народный Сервер #1 [Classic] | https://discord.gg/rn-server",
  },
  {
    label: "RNS #2 RAAS/AAS",
    name: "  [ RU ] Русский Народный Сервер #2 [RAAS/AAS] | https://discord.gg/rn-server",
  },
  {
    label: "RNS #3 INV",
    name: "  [ RU ] Русский Народный Сервер #3 [INV] | https://discord.gg/rn-server",
  },
  {
    label: "RNS #4",
    name: "  [ RU ] Русский Народный Сервер #4 | ВС РФ против ВСУ 24/7",
  },
  {
    label: "RNS KOTH",
    name: "Русский Народный Модовый #4",
  },
];

export async function initLobbyButtons(
  client,
  channelId,
  _steamApiKeyNotUsed,
  domain,
) {
  console.log("[lobbyButtons] initLobbyButtons, SERVERS =", SERVERS.length);

  if (!domain) {
    console.error(
      "ERROR: domain is required (used to build http redirect links)",
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
    (m) => m.author.id === channel.client.user.id && m.components.length,
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

  console.log(
    "[lobbyButtons] rowData.components.length =",
    rowData.components.length,
  );

  if (rowData.components.length) {
    await msg.edit({ components: [row] });
  } else {
    await msg.edit({ components: [] });
  }
}

function buildRow(domain) {
  console.log("[lobbyButtons] buildRow, SERVERS.length =", SERVERS.length);

  const row = new ActionRowBuilder();

  if (!SERVERS || !SERVERS.length) {
    console.warn("[lobbyButtons] SERVERS пустой, кнопки не создаём");
    return row;
  }

  for (const srv of SERVERS) {
    const fullName = (srv.name || "").trim();
    if (!fullName) continue;

    const label = (srv.label || fullName || "").trim();
    if (!label) continue;

    const encodedName = encodeURIComponent(fullName);
    const url = `http://${domain}${JOIN_PATH}?name=${encodedName}`;

    row.addComponents(
      new ButtonBuilder()
        .setLabel(label)
        .setStyle(ButtonStyle.Link)
        .setURL(url),
    );
  }

  return row;
}
