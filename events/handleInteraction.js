import getSteamIdModal from "../utility/getSteamIdModal.js";
import donateInteraction from "../utility/donateInteraction.js";
import bonusInteraction from "../utility/bonusInteraction.js";
import checkVipInteraction from "../utility/checkVipInteraction.js";
import { handleDuelButton } from "../utility/duelGame.js";
import steamIdFormSubmit from "../utility/getSteamIdFormSubmit.js";

export async function handleInteractionCreate(
  interaction,
  client,
  interCollections,
  options,
  db,
  steamApi
) {
  if (
    interaction.commandName === "addtoclanvip" ||
    interaction.commandName === "removefromclanvip"
  ) {
    client.users.fetch(options.idForNotification, false).then((user) => {
      user.send(`${interaction.user.globalName}, ${interaction.commandName}`);
    });
  }

  const command = interaction.client.commands.get(interaction.commandName);

  if (interaction.isChatInputCommand()) {
    try {
      if (interaction.commandName === "duel") {
        if (interCollections.has(interaction.user.id)) {
          await interaction.reply({
            content: "У вас уже есть активная дуэль",
            ephemeral: true,
          });
          return;
        }
        interCollections.set(interaction.user.id, interaction);

        setTimeout(() => {
          interCollections.delete(interaction.user.id);
        }, 300000);
      }
      await command.execute(interaction);
    } catch (error) {
      console.log(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
  }

  if (interaction.isButton()) {
    const buttonId = interaction.customId;

    if (buttonId.includes("duel"))
      await handleDuelButton(interaction, interCollections);

    if (buttonId === "SteamID") await getSteamIdModal(interaction);

    if (buttonId === "donatVip")
      await donateInteraction(interaction, process.env.DATABASE_URL);

    if (buttonId === "bonusVip")
      await bonusInteraction(interaction, process.env.DATABASE_URL);

    if (buttonId === "checkVip")
      await checkVipInteraction(interaction, options.adminsCfgPath);
  }

  if (interaction.isModalSubmit()) {
    const steamIdField = interaction.fields.fields.get("steamid64input");
    const steamLink = steamIdField?.value;

    if (steamLink) {
      if (interaction.customId === "steamidModal") {
        steamIdFormSubmit(interaction, steamLink, db, steamApi);
      }
    }
  }
}
