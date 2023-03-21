import { ref, get } from "firebase/database";

async function sortUsers(db, sort) {
  const test = ref(db, "users");
  const data = await get(test);
  const tempPlayers = data.val();
  let stats = Object.values(tempPlayers);
  let injectKd = [];
  let statsSort = [];
  let players = [];

  for (const key in stats) {
    stats[key].kd = stats[key].kills / stats[key].death;
    injectKd.push(stats[key]);
    if (injectKd[key].kills > 500) {
      statsSort.push(stats[key]);
    }
  }

  const sortBy = statsSort.sort((a, b) => (a[sort] < b[sort] ? 1 : -1));
  for (const key in sortBy) {
    const a = sortBy[key];
    players.push(
      `(${key}) ` +
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
        a.kd.toFixed(2)
    );
    if (key === "20") break;
  }

  return players;
}
export default sortUsers;
