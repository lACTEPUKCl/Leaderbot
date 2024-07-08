import { Client, GatewayIntentBits, Events } from "discord.js";
import { config } from "dotenv";
import options from "./config.js";
config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await client.guilds.cache
    .get(options.discordServerId)
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
