import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Rcon } from "rcon-client";
import fetch from "node-fetch";

const APP_ID = "393380";

const SERVERS = JSON.parse(process.env.SERVERS_CONFIG || "[]");
if (!SERVERS.length) {
  console.error("SERVERS_CONFIG не задан или пуст");
  process.exit(1);
}

async function getFirstPlayer(srv) {
  const rcon = new Rcon({
    host: srv.host,
    port: srv.rconPort,
    password: srv.password,
  });
  try {
    await rcon.connect();
    const raw = await rcon.send("ListPlayers");
    const line = raw.split("\n").find((l) => l.includes("steam:"));
    if (!line) return null;
    const m = line.match(/steam:\s*(\d{17})/);
    return m ? { steamID: m[1] } : null;
  } finally {
    rcon.end();
  }
}

async function fetchLobbyId(steamID, apiKey) {
  const url = new URL(
    "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/"
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamids", steamID);
  const res = await fetch(url);
  const json = await res.json();
  return json.response.players[0]?.lobbysteamid || null;
}

async function updateServerData(steamKey) {
  for (const srv of SERVERS) {
    const first = await getFirstPlayer(srv);
    if (first) {
      srv.steamId = first.steamID;
      srv.lobbyId = await fetchLobbyId(first.steamID, steamKey);
    } else {
      srv.steamId = srv.lobbyId = null;
    }
  }
}

function buildRow(domain) {
  const row = new ActionRowBuilder();
  for (const srv of SERVERS) {
    const url =
      srv.lobbyId && srv.steamId
        ? `https://${domain}/joinlobby/${APP_ID}/${srv.lobbyId}/${srv.steamId}`
        : "https://example.com";
    row.addComponents(
      new ButtonBuilder()
        .setLabel(srv.label)
        .setStyle(ButtonStyle.Link)
        .setURL(url)
    );
  }
  return row;
}

export async function initLobbyButtons(client, channelId, steamKey, domain) {
  const channel = await client.channels.fetch(channelId);
  const messages = await channel.messages.fetch({ limit: 50 });
  let msg = messages.find(
    (m) =>
      m.author.id === client.user.id &&
      m.components.length > 0 &&
      m.components[0].components[0].label === SERVERS[0].label
  );

  if (!msg) {
    msg = await channel.send({
      content: "Нажмите кнопку для подключения к лобби первого игрока:",
      components: [buildRow(domain)],
    });
  }

  await updateServerData(steamKey);
  await msg.edit({ components: [buildRow(domain)] });
  setInterval(async () => {
    await updateServerData(steamKey);
    await msg.edit({ components: [buildRow(domain)] });
  }, 30_000);
}
