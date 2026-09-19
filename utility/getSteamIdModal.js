import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import jwt from 'jsonwebtoken';

// Linking must prove Steam ownership on the site, not accept somebody else's ID.
export default async function getSteamIdModal(interaction) {
  await interaction.deferReply({ flags: 64 });
  const base = process.env.LINK_STEAM_URL;
  const secret = process.env.LINK_SIGN_SECRET;
  if (!base || !secret) return interaction.editReply('Привязка Steam временно недоступна. Обратитесь к администрации.');
  const url = new URL(base);
  url.searchParams.set('token', jwt.sign({ discordId: interaction.user.id }, secret, { algorithm: 'HS256', expiresIn: '30m' }));
  const button = new ButtonBuilder().setLabel('Привязать Steam через сайт').setStyle(ButtonStyle.Link).setURL(url.toString());
  return interaction.editReply({ content: 'Войдите через Steam на сайте, чтобы подтвердить владение аккаунтом.', components: [new ActionRowBuilder().addComponents(button)] });
}
