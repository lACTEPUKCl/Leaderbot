import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const JOIN_PATH = "/api/sqb/join-link";
const REFRESH_MS = Number(process.env.REFRESH_MS || 30000);

const VANILLA_SERVERS = [
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
];

const MOD_SERVERS = [
  {
    label: "SuperMod",
    name: " [ SuperMod ] Русский Народный Модовый #1 [RU] [SPM] [SU]",
  },
  {
    label: "WARZONE #2",
    name: " [ WARZONE ] Русский Народный Модовый #2 | НОВЫЙ МОД!!!",
  },
  {
    label: "WARZONE #3",
    name: " [ WARZONE ] Русский Народный Модовый #3 | НОВЫЙ МОД!!! | 24/7 |",
  },
  {
    label: "WARZONE #4",
    name: " [ WARZONE ] Русский Народный Модовый #4 | ВС РФ против ВСУ 24/7",
  },
];

const GROUPS = [
  {
    title: "Русский Народный Сервер",
    servers: VANILLA_SERVERS,
    tag: "vanilla",
  },
  {
    title: "Русский Народный Модовый",
    servers: MOD_SERVERS,
    tag: "mod",
  },
];

export async function initLobbyButtons(
  client,
  channelId,
  _steamApiKeyNotUsed,
  domain,
) {
  console.log("[lobbyButtons] initLobbyButtons");

  if (!domain) {
    console.error(
      "ERROR: domain is required (used to build http redirect links)",
    );
    process.exit(1);
  }

  const channel = await client.channels.fetch(channelId);
  const messages = {};
  for (const group of GROUPS) {
    messages[group.tag] = await findOrCreateMessage(channel, group);
  }

  for (const group of GROUPS) {
    await editMessage(messages[group.tag], group, domain);
  }

  setInterval(async () => {
    for (const group of GROUPS) {
      try {
        await editMessage(messages[group.tag], group, domain);
      } catch (err) {
        console.error(
          `[lobbyButtons] refresh error (${group.tag}):`,
          err.message,
        );
      }
    }
  }, REFRESH_MS);
}

async function findOrCreateMessage(channel, group) {
  const fetched = await channel.messages.fetch({ limit: 50 });
  const existing = fetched.find(
    (m) =>
      m.author.id === channel.client.user.id && m.content.includes(group.title),
  );
  if (existing) return existing;

  return channel.send({
    content: [
      `**${group.title}**`,
      "",
      "1) Запустите игру **Squad**.",
      "2) Нажмите на кнопку нужного сервера ниже.",
    ].join("\n"),
  });
}

async function editMessage(msg, group, domain) {
  const row = buildRow(group.servers, domain);
  const rowData = row.toJSON();

  console.log(
    `[lobbyButtons] ${group.tag}: ${rowData.components.length} buttons`,
  );

  if (rowData.components.length) {
    await msg.edit({ components: [row] });
  } else {
    await msg.edit({ components: [] });
  }
}

function buildRow(servers, domain) {
  const row = new ActionRowBuilder();

  for (const srv of servers) {
    const fullName = srv.name || "";
    if (!fullName) continue;

    const label = srv.label || fullName || "";
    if (!label) continue;

    const encodedName = encodeURIComponent(fullName);
    const url = `${domain}${JOIN_PATH}?name=${encodedName}`;

    row.addComponents(
      new ButtonBuilder()
        .setLabel(label)
        .setStyle(ButtonStyle.Link)
        .setURL(url),
    );
  }

  return row;
}
