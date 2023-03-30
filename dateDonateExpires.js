import fs from "fs";

function dateDonateExpires(discordId, adminUrl, message) {
  const currentUser = [];
  const date = [];
  const regexp =
    /^Admin=[0-9]*:Reserved [//]* DiscordID [0-9]* do [0-9]{2}\.[0-9]{2}\.[0-9]{4}/gm;
  fs.readFile(`${adminUrl}Admins.cfg`, "utf-8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    data.split("\r\n").map((e) => {
      const user = e.match(regexp);
      if (user) {
        if (user.toString().includes(discordId)) {
          currentUser.push(user);
          date.push(
            currentUser[0].toString().match(/[0-9]{2}\.[0-9]{2}\.[0-9]{4}/)[0]
          );
          message.reply(`Дата окончания Vip статуса - ${date.toString()}`);
        }
      }
    });
  });
}
export default dateDonateExpires;
