import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Rcon } from "rcon-client";
import fetch from "node-fetch";

const APP_ID = "393380";
let SERVERS = [];

export async function initLobbyButtons(client, channelId, steamApiKey, domain) {
  try {
    SERVERS = JSON.parse(process.env.SERVERS_CONFIG);
  } catch (err) {
    console.error("ERROR: SERVERS_CONFIG must be valid JSON", err);
    process.exit(1);
  }

  const channel = await client.channels.fetch(channelId);
  let controlMsg = await findOrCreateMessage(channel);

  await updateServerData(steamApiKey);
  await editMessage(controlMsg, domain);

  setInterval(async () => {
    await updateServerData(steamApiKey);
    await editMessage(controlMsg, domain);
  }, 30_000);
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
      "1. Запустите игру **Squad** и дождитесь загрузки главное меню.",
      "2. После того как вы окажетесь в главном меню, нажмите на кнопку сервера ниже:",
    ].join("\n"),
  });
}

async function editMessage(msg, domain) {
  const row = buildRow(domain);
  const rowData = row.toJSON();
  if (rowData.components.length) {
    await msg.edit({
      components: [row],
    });
  } else {
    await msg.edit({ components: [] });
  }
}

async function updateServerData(steamApiKey) {
  for (const srv of SERVERS) {
    let raw;
    try {
      const rcon = new Rcon({
        host: srv.host,
        port: srv.rconPort,
        password: srv.password,
      });
      await rcon.connect();
      raw = await rcon.send("ListPlayers");
      rcon.end();
    } catch {
      srv.playerCount = 0;
      srv.firstSteamId = srv.lobbyId = null;
      continue;
    }

    const steamIds = raw
      .split("\n")
      .filter((l) => l.includes("steam:"))
      .map((l) => {
        const m = l.match(/steam:\s*(\d{17})/);
        return m ? m[1] : null;
      })
      .filter(Boolean);

    srv.playerCount = steamIds.length;
    srv.firstSteamId = srv.lobbyId = null;

    for (const steamId of steamIds) {
      const lobbyId = await fetchLobbyId(steamApiKey, steamId);
      if (lobbyId) {
        srv.firstSteamId = steamId;
        srv.lobbyId = lobbyId;
        break;
      }
    }
  }
}

async function fetchLobbyId(apiKey, steamId) {
  const url = new URL(
    "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/"
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamids", steamId);

  const res = await fetch(url);
  const json = await res.json();
  return json.response.players?.[0]?.lobbysteamid ?? null;
}

function buildRow(domain) {
  const row = new ActionRowBuilder();
  for (const srv of SERVERS) {
    if (srv.playerCount > 0 && srv.lobbyId && srv.firstSteamId) {
      const url = `https://${domain}/joinlobby/${APP_ID}/${srv.lobbyId}/${srv.firstSteamId}`;
      row.addComponents(
        new ButtonBuilder()
          .setLabel(srv.label)
          .setStyle(ButtonStyle.Link)
          .setURL(url)
      );
    }
  }
  return row;
}
