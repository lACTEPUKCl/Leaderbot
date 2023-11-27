import fs from "fs";

async function dateDonateExpires(adminUrl, interaction) {
  const currentUser = [];
  const date = [];
  const regexp =
    /^Admin=[0-9]*:Reserved [//]* DiscordID [0-9]* do [0-9]{2}\.[0-9]{2}\.[0-9]{4}/gm;
  fs.readFile(`${adminUrl}Admins.cfg`, "utf-8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    data.split("\r\n").some((e) => {
      const user = e.match(regexp);
      if (user) {
        if (user.toString().includes(interaction.user.id)) {
          currentUser.push(user);
          date.push(
            currentUser[0].toString().match(/[0-9]{2}\.[0-9]{2}\.[0-9]{4}/)[0]
          );
          interaction.reply(`Дата окончания Vip статуса - ${date.toString()}`);
          return true;
        }
      }
    });
  });
}
export default dateDonateExpires;
