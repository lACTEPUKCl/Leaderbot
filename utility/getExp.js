function getExp(user) {
  const {
    kills: expForKills,
    death: expForDeath,
    revives: expForRevives,
    teamkills: expForTeamkills,
  } = user;
  const {
    cmd: expForCmd,
    leader: expForLeader,
    timeplayed: expForTime,
  } = user.squad;
  const { won: expForWin, lose: expForLose } = user.matches;
  let exp =
    expForTime +
    expForKills * 2 +
    expForRevives * 2 -
    expForDeath -
    expForTeamkills * 2 +
    expForLeader * 2 +
    expForCmd * 4 +
    expForWin * 10 -
    expForLose * 5;
  if (exp > 0 && exp < 5000) {
    const rankPct = exp / 5000;
    const rankStr = "Рядовой";
    const expProgress = `${exp} / 5000`;
    const img = "1";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 5000 && exp < 10000) {
    const rankPct = exp / 10000;
    const rankStr = "Eфрейтор";
    const expProgress = `${exp} / 10000`;
    const img = "2";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 10000 && exp < 20000) {
    const rankPct = exp / 20000;
    const rankStr = "Младший сержант";
    const expProgress = `${exp} / 20000`;
    const img = "3";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 20000 && exp < 40000) {
    const rankPct = exp / 40000;
    const rankStr = "Сержант";
    const expProgress = `${exp} / 40000`;
    const img = "4";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 40000 && exp < 70000) {
    const rankPct = exp / 70000;
    const rankStr = "Старший сержант";
    const expProgress = `${exp} / 70000`;
    const img = "5";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 70000 && exp < 80000) {
    const rankPct = exp / 80000;
    const rankStr = "Старшина";
    const expProgress = `${exp} / 80000`;
    const img = "6";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 80000 && exp < 110000) {
    const rankPct = exp / 110000;
    const rankStr = "Прапорщик";
    const expProgress = `${exp} / 110000`;
    const img = "7";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 110000 && exp < 120000) {
    const rankPct = exp / 120000;
    const rankStr = "Старший прапорщик";
    const expProgress = `${exp} / 120000`;
    const img = "8";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 120000 && exp < 140000) {
    const rankPct = exp / 140000;
    const rankStr = "Младший лейтенант";
    const expProgress = `${exp} / 140000`;
    const img = "9";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 140000 && exp < 170000) {
    const rankPct = exp / 170000;
    const rankStr = "Лейтенант";
    const expProgress = `${exp} / 170000`;
    const img = "10";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 170000 && exp < 200000) {
    const rankPct = exp / 200000;
    const rankStr = "Старший лейтенант";
    const expProgress = `${exp} / 200000`;
    const img = "11";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 200000 && exp < 240000) {
    const rankPct = exp / 240000;
    const rankStr = "Капитан";
    const expProgress = `${exp} / 240000`;
    const img = "12";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 240000 && exp < 280000) {
    const rankPct = exp / 280000;
    const rankStr = "Майор";
    const expProgress = `${exp} / 280000`;
    const img = "13";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 280000 && exp < 320000) {
    const rankPct = exp / 320000;
    const rankStr = "Подполковник";
    const expProgress = `${exp} / 320000`;
    const img = "14";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 320000 && exp < 370000) {
    const rankPct = exp / 370000;
    const rankStr = "Полковник";
    const expProgress = `${exp} / 370000`;
    const img = "15";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 370000 && exp < 420000) {
    const rankPct = exp / 420000;
    const rankStr = "Генерал майор";
    const expProgress = `${exp} / 420000`;
    const img = "16";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 420000 && exp < 470000) {
    const rankPct = exp / 470000;
    const rankStr = "Генерал лейтенант";
    const expProgress = `${exp} / 470000`;
    const img = "17";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 470000 && exp < 520000) {
    const rankPct = exp / 520000;
    const rankStr = "Генерал полковник";
    const expProgress = `${exp} / 520000`;
    const img = "18";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 520000 && exp < 600000) {
    const rankPct = exp / 600000;
    const rankStr = "Генерал РНС";
    const expProgress = `${exp} / 600000`;
    const img = "19";
    return { rankPct, rankStr, expProgress, img };
  }
  if (exp > 600000) {
    const rankPct = 1;
    const rankStr = "Маршал РНС";
    const expProgress = `${exp}`;
    const img = "20";
    return { rankPct, rankStr, expProgress, img };
  }
}

export default getExp;
