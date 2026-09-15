import https from 'node:https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ProxyAgent } from 'undici';

export function isDiscordHost(host) {
  const name = String(host || '').toLowerCase().replace(/:\d+$/, '');
  return ['discord.com', 'discord.gg', 'discordapp.com', 'discordapp.net'].some(domain => name === domain || name.endsWith('.' + domain));
}

// @discordjs/ws 1.x does not forward ws.agent and supplies createConnection,
// bypassing https.globalAgent. Inject an explicit agent only for Discord HTTPS
// requests; never proxy unrelated Steam, Telegram or site traffic.
export function installDiscordTransport(proxyUrl = process.env.DISCORD_PROXY_URL) {
  if (!proxyUrl) return {};
  const parsed = new URL(proxyUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Discord proxy must use HTTP CONNECT');
  const previous = https.request;
  const proxy = new HttpsProxyAgent(proxyUrl, { keepAlive: true });
  https.request = function(input, options, callback) {
    const urlInput = typeof input === 'string' || input instanceof URL;
    const settings = urlInput ? (typeof options === 'object' && options !== null ? options : {}) : input;
    const host = urlInput ? new URL(input).hostname : settings?.hostname || settings?.host;
    if (!isDiscordHost(host) || settings?.agent !== undefined) return previous.apply(this, arguments);
    if (urlInput) return previous.call(this, input, {...settings, agent:proxy}, typeof options === 'function' ? options : callback);
    return previous.call(this, {...settings, agent:proxy}, options);
  };
  console.log('[BOT] Discord REST and Gateway proxy enabled');
  return { rest: { agent: new ProxyAgent({uri:proxyUrl,connections:8,connectTimeout:10_000}) } };
}
