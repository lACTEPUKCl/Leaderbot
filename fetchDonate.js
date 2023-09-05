import fs from "fs";
import creater from "./vip-creater.js";

async function addTransaction(steamId, jsonData, message, vipRole, user) {
  const username = message.author.username;
  const discordId = message.author.id;
  const { id, sum } = jsonData;
  fs.readFile(`./transactionId.json`, (err, data) => {
    if (err) return;
    let transaction = JSON.parse(data);
    const getTrans = transaction.transactions.find(
      (e) => e.id === id.toString()
    );
    if (!getTrans) {
      transaction.transactions.push({
        id: `${id}`,
        username,
        steamID: steamId,
      });

      creater.vipCreater(steamId, username, sum, discordId);
      user.roles.add(vipRole);
      message.channel.send({
        content: `Игроку <@${message.author.id}> - выдан VIP статус, спасибо за поддержку!`,
      });
      try {
        message.delete();
      } catch (error) {}

      let newData = JSON.stringify(transaction);
      fs.writeFile(`./transactionId.json`, newData, (err) => {
        if (err) return;
      });
    } else {
      console.log("VIP по этому донату уже был выдан");
      try {
        message.author.send("VIP по этому донату уже был выдан");
      } catch (error) {
        console.log(
          "Невозможно отправить сообщение пользователю",
          message.author.username
        );
      }
      try {
        message.delete();
      } catch (error) {}
    }
  });
}
export default addTransaction;
