import { EmbedBuilder } from "discord.js";
import sortUsers from "./sortUsers.js";

async function editEmbed({
  channel,
  db,
  sort,
  messageId,
  authorName,
  seconds,
}) {
  setTimeout(async () => {
    const players = await sortUsers(db, sort);
    await channel.messages
      .fetch(`${messageId}`)
      .then((message) => {
        const playersTable = Array(20)
          .fill(0)
          .map((e, i) => players[i])
          .join("\r\n");
        let exampleEmbed = new EmbedBuilder()
          .setAuthor({
            name: `${authorName}`,
            iconURL:
              "https://cdn.discordapp.com/icons/735515208348598292/21416c8e956be0ffed0b7fc49afc5624.webp",
          })
          .setDescription(playersTable)
          .setColor(0x0099ff)
          .setTimestamp()
          .setFooter({
            text: "Статистика обновлялась",
            iconURL:
              "https://cdn.discordapp.com/icons/735515208348598292/21416c8e956be0ffed0b7fc49afc5624.webp",
          });
        message.edit({ embeds: [exampleEmbed] });
      })
      .catch(console.error);
  }, seconds);
}
export default editEmbed;
