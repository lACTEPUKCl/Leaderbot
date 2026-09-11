import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const JOIN_PATH = "/api/sqb/join-link";
const REFRESH_MS = Number(process.env.REFRESH_MS || 30000);
const lastPayload = new WeakMap();

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
    label: "Vietnam SuperMod",
    name: " [ VIETNAM | SUPERMOD ] Русский Народный Модовый #2 | PLAYTEST",
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
  ...(process.env.WARDOGS_LOBBY_ENABLED === 'true' ? [{title:'Wardogs | Русский Народный Сервер',game:'Wardogs',tag:'wardogs',servers:[{label:'Играть в Wardogs',name:'Wardogs',path:'/api/wardogs/join-link'}]}] : []),
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

  let refreshing = false;
  setInterval(async () => {
    if (refreshing) return;
    refreshing = true;
    try {
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
    } finally { refreshing = false; }
  }, REFRESH_MS);
}

export function matchesLobbyMessage(message, botId, title) {
  return message.author?.id === botId && message.content?.split(/\r?\n/, 1)[0].trim() === `**${title}**`;
}

async function findOrCreateMessage(channel, group) {
  const fetched = await channel.messages.fetch({ limit: 50 });
  const existing = fetched.find(
    (m) =>
      matchesLobbyMessage(m, channel.client.user.id, group.title),
  );
  if (existing) return existing;

  return channel.send({
    content: [
      `**${group.title}**`,
      "",
      `1) Запустите игру **${group.game || 'Squad'}**.`,
      "2) Нажмите на кнопку нужного сервера ниже.",
    ].join("\n"),
  });
}

export async function editMessage(msg, group, domain) {
  const row = buildRow(group.servers, domain);
  const rowData = row.toJSON();
  const signature = JSON.stringify(rowData);
  if (lastPayload.get(msg) === signature) return;

  console.log(
    `[lobbyButtons] ${group.tag}: ${rowData.components.length} buttons`,
  );

  if (rowData.components.length) {
    await msg.edit({ components: [row] });
  } else {
    await msg.edit({ components: [] });
  }
  lastPayload.set(msg, signature);
}

export function buildRow(servers, domain) {
  const row = new ActionRowBuilder();

  for (const srv of servers) {
    const fullName = srv.name || "";
    if (!fullName) continue;

    const label = srv.label || fullName || "";
    if (!label) continue;

    const target = new URL(srv.path || JOIN_PATH, domain);
    if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password) {
      throw new Error('Lobby domain must be an HTTP(S) URL without credentials');
    }
    target.searchParams.set('name', fullName);
    const url = target.href;

    row.addComponents(
      new ButtonBuilder()
        .setLabel(label)
        .setStyle(ButtonStyle.Link)
        .setURL(url),
    );
  }

  return row;
}
