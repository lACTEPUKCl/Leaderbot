export async function handleDuelButton(interaction, interCollections) {
  if (interCollections.has(interaction.customId.split("_")[1])) {
    try {
      await interCollections
        .get(interaction.customId.split("_")[1])
        .deleteReply();
    } catch (error) {
      console.error("Error deleting duel interaction reply:", error);
    }
    interCollections.delete(interaction.customId.split("_")[1]);
  }

  const user1 = interaction.customId.split("_")[1];
  const user2 = interaction.user.id;

  let loserId;
  let winnerId;
  if (Math.random() < 0.5) {
    loserId = user1;
    winnerId = user2;
  } else {
    loserId = user2;
    winnerId = user1;
  }

  const deathReasons = [
    `Пуля выпущенная <@${winnerId}> попала <@${loserId}> прямо в сердце.`,
    `Рапира <@${winnerId}> пронзила <@${loserId}> насквозь.`,
    `Стрела выпущенная <@${winnerId}> пронзила грудь <@${loserId}>.`,
    `Сабля <@${winnerId}> разрубила <@${loserId}> на две части.`,
    `<@${loserId}> скрытно пронзили кинжалом в спину.`,
    `<@${winnerId}> ударил по голове <@${loserId}> настолько сильно, что он мгновенно умер.`,
    `<@${loserId}> упал замертво от отравленного дротика выпущенного <@${winnerId}>.`,
    `<@${winnerId}> ударил шпагою и попал в жизненно важный орган <@${loserId}>.`,
    `<@${winnerId}> обезглавил <@${loserId}> одним ударом меча.`,
    `<@${winnerId}> ударил копьем и пробил <@${loserId}> насквозь.`,
    `<@${winnerId}> пронзил сердце <@${loserId}>.`,
    `<@${winnerId}> утопил <@${loserId}> в реке после смертельного удара.`,
    `<@${winnerId}> нанес смертельный удар шипом в шею <@${loserId}>.`,
    `<@${winnerId}> кинул гранату и разорвал <@${loserId}> на куски.`,
    `<@${loserId}> истек кровью после глубокого ранения.`,
    `Сердце <@${loserId}> остановилось от ножевого удара <@${winnerId}>.`,
    `Голову <@${loserId}> пронзила стрела выпущенная <@${winnerId}>.`,
    `Пуля выпущенная <@${winnerId}> пробила череп <@${loserId}>.`,
    `<@${winnerId}> выстрелом пушки разорвал на части <@${loserId}>.`,
    `<@${winnerId}> нанес смертельный удар кинжалом в грудь <@${loserId}>.`,
    `<@${winnerId}> ранил насмерть ядовитым кинжалом <@${loserId}>.`,
    `Стрела выпущенная <@${winnerId}> попала прямо в сердце <@${loserId}>.`,
  ];

  const randomIndex = Math.floor(Math.random() * deathReasons.length);
  const randomString = deathReasons[randomIndex];
  await interaction.reply(randomString);

  await muteMember(loserId, interaction.guild);
}

async function muteMember(memberId, guild) {
  try {
    const member = await guild.members.fetch(memberId);
    await member.timeout(600000, "Duel loss");
  } catch (error) {}
}
