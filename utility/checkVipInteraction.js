import fs from "fs";

async function checkVipInteraction(interaction, adminUrl) {
  const currentUser = [];
  const date = [];
  const regexp =
    /^Admin=[0-9]*:Reserved [//]* DiscordID [0-9]* do [0-9]{2}\.[0-9]{2}\.[0-9]{4}/gm;

  fs.readFile(`${adminUrl}Admins.cfg`, "utf-8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    let userFound = false;

    data.split("\r\n").some((e) => {
      const user = e.match(regexp);
      if (user && user.toString().includes(interaction.user.id)) {
        currentUser.push(user);
        date.push(
          currentUser[0].toString().match(/[0-9]{2}\.[0-9]{2}\.[0-9]{4}/)[0]
        );
        interaction.reply({
          content: `Дата окончания Vip статуса - ${date.toString()}`,
          ephemeral: true,
        });
        userFound = true;
        return true;
      }
      return false;
    });

    if (!userFound) {
      interaction.reply({
        content: `VIP статус отсутствует!`,
        ephemeral: true,
      });
    }
  });
}

export default checkVipInteraction;
