import axios from 'axios';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, escapeMarkdown } from 'discord.js';

const safe = (value, max) => escapeMarkdown(String(value || '')).slice(0, max);
const date = value => value ? `<t:${Math.floor(new Date(value).getTime() / 1000)}:f>` : 'Бессрочно';
export function banReply(data) {
  if (!Array.isArray(data?.bans) || typeof data.truncated !== 'boolean') throw new Error('invalid-panel-response');
  if (!data.bans.length) return { content: 'Действующих банов по этому запросу в нашей панели не найдено.', allowedMentions: { parse: [] } };
  const bans = data.bans.slice(0, 10);
  for (const b of bans) {
    if (!b || (b.expiresAt && !Number.isFinite(new Date(b.expiresAt).getTime()))) throw new Error('invalid-panel-ban');
  }
  return {
    content: data.truncated ? 'Показаны первые 10 банов. Уточните запрос: отправьте Steam ID или EOS ID.' : undefined,
    embeds: bans.map(b => new EmbedBuilder().setColor(0xc66352)
      .setTitle(safe(b.name || b.steamId || b.eosId || 'Игрок', 100))
      .setDescription(safe(b.reason || 'Причина не указана', 200))
      .addFields(
        { name: 'Тип', value: b.nameBan ? 'Ограничение по нику, не блокировка аккаунта' : 'Бан игрока' },
        { name: 'Окончание', value: date(b.expiresAt), inline: true },
        { name: 'Действует', value: safe(b.serverKey || 'Все серверы RNS', 80), inline: true },
        { name: 'Steam ID / EOS ID', value: safe(b.steamId || b.eosId || 'Не указан', 40) })),
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Обжаловать бан').setStyle(ButtonStyle.Link)
      .setURL('https://discord.com/channels/735515208348598292/1068565169694851182'))],
    allowedMentions: { parse: [] },
  };
}

export default async function getBansFromPanel(message, { http = axios, env = process.env } = {}) {
  const q = String(message.content || '').trim();
  if (q.length < 2 || q.length > 200) return message.reply({ content: 'Отправьте ник, Steam ID, EOS ID или ссылку Steam вида /profiles/SteamID.', allowedMentions: { parse: [] } });
  try {
    const baseUrl = env.BAN_LOOKUP_API_URL || env.SITE_API_URL;
    if (!baseUrl || !env.LEADERBOT_BAN_LOOKUP_KEY) throw new Error('not-configured');
    const url = `${baseUrl.replace(/\/+$/, '')}/integrations/leaderbot/bans`;
    const response = await http.get(url, { params: { q }, timeout: 10000, maxRedirects: 0,
      headers: { Authorization: `Bearer ${env.LEADERBOT_BAN_LOOKUP_KEY}` } });
    return await message.reply(banReply(response.data));
  } catch (error) {
    // Never log Axios errors: they contain the authorization header.
    console.error('[ban-lookup] panel request failed', error?.response?.status || 'unavailable');
    return message.reply({ content: error?.response?.status === 400
      ? 'Не удалось распознать запрос. Отправьте Steam ID, EOS ID или ник. Для короткой ссылки /id/ нужен Steam ID.'
      : 'Сейчас не удалось проверить бан через нашу панель. Повторите позже — это не означает, что бана нет.', allowedMentions: { parse: [] } });
  }
}
