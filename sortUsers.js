import { MongoClient } from "mongodb";

async function sortUsers(db, sort) {
  const clientdb = new MongoClient(db);
  const dbName = "SquadJS";
  const dbCollection = "tempstats";

  try {
    await clientdb.connect();
    const db = clientdb.db(dbName);
    const collection = db.collection(dbCollection);
    const result = await collection
      .find({ kills: { $gte: 500 } })
      .sort({ [sort]: -1 })
      .limit(20)
      .toArray();
    const players = [];
    let i = 0;
    for (const key in result) {
      const a = result[key];
      i = i + 1;
      players.push(
        `(${i}) ` +
          a.name +
          ": У: " +
          a.kills +
          " С: " +
          a.death +
          " П: " +
          a.revives +
          " ТK: " +
          a.teamkills +
          " K/D: " +
          a.kd
      );
    }
    return players;
  } catch (e) {
    console.error(e);
  } finally {
    await clientdb.close();
  }
}

export default sortUsers;
