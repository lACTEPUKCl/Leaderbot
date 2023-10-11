import fs from "fs/promises";

async function addUser(steamId, message, callback) {
  const username = message.author.username;
  const discordId = message.author.id;

  try {
    let users = { users: [] };
    try {
      const data = await fs.readFile("./users.json", "utf8");
      users = JSON.parse(data);
    } catch (readError) {
      if (readError.code !== "ENOENT") {
        throw readError;
      }
    }

    const getUser = users.users.find((e) => e.steamID === steamId.toString());

    if (!getUser) {
      users.users.push({
        id: `${discordId}`,
        username,
        steamID: steamId.toString(),
      });

      let newData = JSON.stringify(users);
      await fs.writeFile("./users.json", newData, "utf8");
      callback(true);
      return;
    }

    if (getUser && discordId !== getUser.id && steamId !== getUser.steamID) {
      callback(false);
      try {
        await message.author.send(
          "Пользователь уже зарегистрирован, обратитесь к администрации!"
        );
      } catch (error) {
        console.log(
          "Невозможно отправить сообщение пользователю",
          message.author.username
        );
      }
      return;
    }

    if (getUser && discordId === getUser.id) {
      callback(true);
    }
  } catch (err) {
    console.error(err);
  }
}

export default addUser;
