import { EmbedBuilder } from "discord.js";
import fetch from "node-fetch";

async function getDonate(donateUrl, donateChannel) {
  let json;
  let res;
  let lastDonate = "";
  try {
    let response = await fetch(donateUrl);
    if (response.ok) {
      json = await response.json();
      for (let i = 0; i < 10; i++) {
        let data = json.data[i];
        res = `ID транзакции: ${data.id}\nИмя: ${data.what}\nСумма: ${
          data.sum
        }\nКомментарий: ${data.comment}\nДата: ${data.created_at.slice(
          0,
          19
        )}\n\n`;
        lastDonate = lastDonate + res;
      }

      let exampleEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setAuthor({
          name: "Последние 10 донатов",
          iconURL:
            "https://cdn.discordapp.com/icons/735515208348598292/21416c8e956be0ffed0b7fc49afc5624.webp",
        })
        .setDescription(`${lastDonate}`);
      donateChannel.send({ embeds: [exampleEmbed] });
    } else {
      console.log(`${response.status}: ${response.statusText}`);
    }
  } catch (e) {
    console.log(e.message);
  }
}
export default getDonate;
