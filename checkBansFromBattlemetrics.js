import moment from "moment-timezone";
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

async function checkBansFromBattlemetrics(bans, message) {
  if (!bans) {
    message.reply(`Игрок ${message.content} не найден в списках банов`);
    return;
  }

  if (!bans[0]) {
    message.reply(`Игрок ${message.content} не найден в списках банов`);
    return;
  }

  let timeExpires = moment(bans[0].attributes.expires).tz("Europe/Moscow");
  const currentDate = moment().tz("Europe/Moscow");
  if (timeExpires.isBefore(currentDate)) {
    message.reply(`Игрок ${message.content} не найден в списках банов`);
    return;
  }

  if (timeExpires.toString().includes("Invalid date")) {
    timeExpires = "Perm";
  } else {
    timeExpires = timeExpires.format("YYYY-MM-DD HH:mm");
  }

  let playerName = "Unknown";
  if (bans[0].meta?.player) {
    playerName = bans[0].meta.player;
  }

  const adminName = bans[0].attributes.reason.split("by ")[1];
  let reason = bans[0].attributes.reason;
  if (bans[0].attributes.reason.includes("{{duration}}")) {
    reason = bans[0].attributes.reason.split("{{duration}},")[0];
  }

  const confirm = new ButtonBuilder()
    .setLabel("Обжаловать бан")
    .setStyle(ButtonStyle.Link)
    .setURL(
      "https://discord.com/channels/735515208348598292/1068565169694851182"
    );

  const row = new ActionRowBuilder().addComponents(confirm);

  const exampleEmbed = new EmbedBuilder()
    .setColor(0xff001a)
    .setTitle(playerName)
    .setDescription(reason)
    .addFields(
      { name: "Дата окончания бана:", value: timeExpires },
      { name: "Админ выдавший наказание:", value: adminName }
    );

  message.reply({ embeds: [exampleEmbed], components: [row] });
}
export default checkBansFromBattlemetrics;
