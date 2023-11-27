import { Client, GatewayIntentBits, Events } from "discord.js";
import { config } from "dotenv";
config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await client.guilds.cache
    .get(process.env.GUILD_ID)
    .commands.fetch()
    .then((commands) => {
      commands.forEach((command) => {
        command.delete();
      });
    });
  console.log("Existing commands deleted.");
  await client.destroy();
});

client.login(process.env.CLIENT_TOKEN);
