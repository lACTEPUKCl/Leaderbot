import { ProxyAgent, Agent, request } from 'undici';

// Callback traffic gets its own small pool, separate from uploads and member sync.
export function installInteractionReliability(client, { logger = console, proxyUrl = process.env.DISCORD_PROXY_URL, warmConnection = true } = {}) {
  const dispatcher = proxyUrl
    ? new ProxyAgent({ uri: proxyUrl, connections: 2, connectTimeout: 2000 })
    : new Agent({ connections: 2, connectTimeout: 2000 });
  const originalRequest = client.rest.request.bind(client.rest);
  client.rest.request = options => originalRequest(
    /^\/interactions\/[^/]+\/[^/]+\/callback$/.test(options.fullRoute || '')
      ? { ...options, dispatcher }
      : options
  );
  let warming = false;
  const warm = async () => {
    if (warming) return;
    warming = true;
    try {
      const response = await request('https://discord.com/api/v10/gateway', {
        dispatcher, headersTimeout: 2000, bodyTimeout: 2000
      });
      await response.body.dump();
    } catch (error) {
      logger.warn('[interaction] connection warmup failed: ' + (error.code || error.name));
    } finally { warming = false; }
  };
  const timer = warmConnection ? setInterval(warm, 30_000) : null;
  timer?.unref();
  if (warmConnection) void warm();
  client.prependListener('interactionCreate', interaction => {
    const received = Date.now();
    const kind = interaction.commandName || interaction.customId || interaction.type;
    const age = Math.max(0, received - interaction.createdTimestamp);
    for (const method of ['reply', 'deferReply', 'deferUpdate', 'showModal', 'update']) {
      const original = interaction[method]?.bind(interaction);
      if (!original) continue;
      interaction[method] = async (...args) => {
        const start = Date.now();
        try {
          const result = await original(...args);
          logger.info('[interaction] ' + JSON.stringify({ kind, method, ageMs: age, dispatchMs: start - received, ackMs: Date.now() - start, ok: true }));
          return result;
        } catch (error) {
          logger.warn('[interaction] ' + JSON.stringify({ kind, method, ageMs: age, dispatchMs: start - received, ackMs: Date.now() - start, code: error.code || error.name, ok: false }));
          throw error;
        }
      };
    }
  });
  return async () => { clearInterval(timer); await dispatcher.close(); };
}
