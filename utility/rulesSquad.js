import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  TextInputBuilder,
  ModalBuilder,
  TextInputStyle,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";

export function rulesDiscord(message) {
  // const imagePath = "../image1.png";

  // const attachment = new AttachmentBuilder(imagePath, {
  //   name: "image1.png",
  // });

  // message.channel.send({ files: [attachment] });

  const embed1 = new EmbedBuilder().setColor("#275318").setDescription(`test`);
  message.channel.send({ embeds: [embed1] });

  const embed2 = new EmbedBuilder().setColor("#275318").setDescription(`test2`);
  message.channel.send({ embeds: [embed2] });

  const embed3 = new EmbedBuilder().setColor("#275318").setDescription(`test3`);
  message.channel.send({ embeds: [embed3] });

  const embed4 = new EmbedBuilder().setColor("#275318").setDescription(`test4`);
  message.channel.send({ embeds: [embed4] });
}

export default rulesDiscord;
