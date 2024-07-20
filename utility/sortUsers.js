import { MongoClient } from "mongodb";

async function sortUsers(db, sort, status) {
  const clientdb = new MongoClient(db);
  const dbName = "SquadJS";
  let dbCollection = "mainstats";
  let count = 50;

  if (status === "temp") {
    count = 5;
    dbCollection = "tempstats";
  }

  if (sort === "squad.seed") {
    count = 1;
  }

  try {
    await clientdb.connect();
    const db = clientdb.db(dbName);
    const collection = db.collection(dbCollection);
    const result = await collection
      .find({ "matches.matches": { $gte: count } })
      .sort({ [sort]: -1 })
      .limit(20)
      .toArray();
    const players = result.map((player) => {
      const { name, kills, death, revives, teamkills, kd, matches } = player;
      const matchesMatches = matches.matches;
      const seed = squad.seed;
      return `${name.trim()} ${kills} ${death} ${revives} ${teamkills} ${kd} ${matchesMatches} ${seed}`;
    });
    return players;
  } catch (e) {
    console.error(e);
  } finally {
    await clientdb.close();
  }
}

export default sortUsers;
