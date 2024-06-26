import fs from "fs";

async function dateDonateExpires(adminUrl, interaction) {
  const currentUser = [];
  const date = [];
  const regexpReserved =
    /^Admin=[0-9]*:Reserved [//]* DiscordID [0-9]* do [0-9]{2}\.[0-9]{2}\.[0-9]{4}/gm;
  const regexpClanVip =
    /^Admin=[0-9]*:ClanVip [//]* DiscordID [0-9]* do [0-9]{2}\.[0-9]{2}\.[0-9]{4}/gm;

  fs.readFile(`${adminUrl}Admins.cfg`, "utf-8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    data.split("\r\n").some((e) => {
      const userVip = e.match(regexpReserved);
      const userClanVip = e.match(regexpClanVip);
      if (userVip) {
        if (userVip.toString().includes(interaction.user.id)) {
          currentUser.push(userVip);
          date.push(
            currentUser[0].toString().match(/[0-9]{2}\.[0-9]{2}\.[0-9]{4}/)[0]
          );
          interaction.reply(`Дата окончания Vip статуса - ${date.toString()}`);
          return true;
        }
      }
      if (userClanVip) {
        if (userClanVip.toString().includes(interaction.user.id)) {
          currentUser.push(userClanVip);
          date.push(
            currentUser[0].toString().match(/[0-9]{2}\.[0-9]{2}\.[0-9]{4}/)[0]
          );
          interaction.reply(
            `Дата окончания ClanVip статуса - ${date.toString()}`
          );
          return true;
        }
      }
    });
  });
}

export default dateDonateExpires;
