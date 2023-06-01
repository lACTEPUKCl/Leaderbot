import fs from "fs";
import creater from "./vip-creater.js";

function addTransaction(tempSteamId, jsonData) {
  const [name, discorId, steamId, message] = tempSteamId;
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
        name,
        steamID: steamId,
      });
      creater.vipCreater(steamId, name, sum, discorId);
      message.react("👍");
    }
    let newData = JSON.stringify(transaction);
    fs.writeFile(`./transactionId.json`, newData, (err) => {
      if (err) return;
    });
  });
}
export default addTransaction;
