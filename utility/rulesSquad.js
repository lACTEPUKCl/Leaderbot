import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

export function rulesSquad(server, channel) {
  if (server === "galactic") galactic(channel);
  if (server === "mee") mee(channel);
  if (server === "squadv") squadv(channel);
  if (server === "squad") squad(channel);
  if (server === "vip") vip(channel);
}

function centerText(text) {
  const textLength = text.length;
  const spacesToAdd = 56 - textLength;
  const leftSpaces = Math.floor(spacesToAdd / 2);
  const rightSpaces = spacesToAdd - leftSpaces;
  const centeredText =
    "\u2800".repeat(leftSpaces) + text + "\u2800".repeat(rightSpaces);
  return centeredText;
}

async function galactic(channel) {
  await channel.threads.create({
    name: "Правила Galactic",
    autoArchiveDuration: 60,
    message:
      "https://media.discordapp.net/attachments/1179711462197968896/1209925446926598174/galactic.png",
  });
  const thread = channel.threads.cache.find(
    (x) => x.name === "Правила Galactic"
  );

  const embed = new EmbedBuilder().setColor("#2b2d31").setDescription(
    `
${centerText("**ПРАВИЛА ПОВЕДЕНИЯ**")}

\`\`\`
  ▹ 1. Запрещено разжигание ненависти и конфликтов на политической, религиозной, национальной или расовой почве.
  ▹ 2. Запрещены любые проявления экстремистского и противоправного характера. Это относится к устным и письменным выражениям, никнеймам и клан–тэгам, а также музыкальным композициям, запрещённым в РФ, проявлениям нетерпимости, отчуждения, ксенофобии, антисемитизма и ультранационализма.
  ▹ 3. Категорически запрещены:
    - читерство;
    - провокации;
    - оскорбления родственников, в том числе завуалированные;
    - неоднократные, продолжающиеся во времени оскорбления игроков;
    - негативные и неконструктивные высказывания в адрес сервера;
    - оскорбления сервера и администрации.
  ▹ 4. На РНС запрещена реклама любых других проектов в любом её виде.
  ▹ 5. Запрещены никнеймы, состоящие из мата или других выражений, которые могут быть оскорбительными.
  ▹ 6. Намеренное убийство союзников запрещено.
  ▹ 7. Запрещено передавать информацию об оставшихся тикетах, местах расположения хабов, техники, маршрутах и прочую, которая способна помешать победе Вашей команды.
  ▹ 8. Уничтожение союзной техники/укреплений без предварительного согласования с командой запрещено.
  ▹ 9. Запрещено уничтожение союзного радио (FOB) без предварительного согласования с командой или командиром, поставившим данный FOB.
  ▹ 10. Любое действие, использующее ошибки игры и направленное на достижение положительного результата, является абьюзом игровых механик и категорически запрещено.
\`\`\`

${centerText("**ОБРАТНАЯ СВЯЗЬ**")}

\`\`\`
  ▹ Обратная связь осуществляется через дискорд сообщества discord.gg/rn-server.
  ▹ В качестве доказательств нарушений правил сервера принимаются скрины, видео и ссылки на ютуб.
  ▹ В дискорд – канале сервера (discord.gg/rn-server -> #создать-тикет) необходимо открыть тикет обращения и приложить доказательства нарушения.
  ▹ При отсутствии доказательств администрации будет невозможно наказать виновного.
\`\`\`

${centerText("**АДМИНИСТРАЦИЯ**")}

\`\`\`
  ▹ Окончательная трактовка правил сервера и их изменение остаются за администрацией проекта.
  ▹ Сроки наказания за нарушение и сами нарушения фиксированными не являются и остаются на усмотрение администрации проекта.
  ▹ Любым сбором средств на развитие проекта занимается только администрация проекта.
\`\`\`
`
  );
  thread.send({ embeds: [embed] });
}

async function mee(channel) {
  await channel.threads.create({
    name: "Правила MEE",
    autoArchiveDuration: 60,
    message:
      "https://media.discordapp.net/attachments/1179711462197968896/1209943704324800573/mee.png",
  });
  const thread = channel.threads.cache.find((x) => x.name === "Правила MEE");
  const embed = new EmbedBuilder().setColor("#2b2d31").setDescription(
    `
*Squad - командная игра. Мы поддерживаем действия, которые приносят пользу всей команде. При формировании своего плана на игру обращайте внимание на потребности команды и взаимодействуйте с другими игроками.*

${centerText("**ПРАВИЛА ПОВЕДЕНИЯ**")}

\`\`\`
  ▹ 1.1. Запрещено разжигание ненависти и конфликтов на политической, религиозной, национальной или расовой почве.
  ▹ 1.2. Запрещены любые проявления экстремистского и противоправного характера. Это относится к устным и письменным выражениям, никнеймам и клан–тэгам, а также музыкальным композициям, запрещенным в РФ, проявлениям нетерпимости, отчуждения, ксенофобии, антисемитизма и ультранационализма.
  ▹ 1.3. Категорически запрещены:
    - читерство;
    - провокации;
    - оскорбления родственников, в том числе завуалированные;
    - неоднократные, продолжающиеся во времени оскорбления игроков;
    - негативные и неконструктивные высказывания в адрес сервера;
    - оскорбления сервера и администрации.
  ▹ 1.4. Запрещена реклама любых других проектов в любом ее виде.
  ▹ 1.5. Запрещено использование саундпада в командирском канале.
  ▹ 1.6. Запрещены никнеймы, состоящие из: иероглифов; цифр; фигурных символов или букв, которые Squad отображает как знаки вопроса; специальных символов; мата или других выражений, которые могут быть оскорбительными; а также не имеющие смысла.
  ▹ 1.7. Запрещено использование никнейма другого игрока или клан-тэга без разрешения.
  ▹ 1.8. Любое действие, использующее ошибки игры и направленное на достижение положительного результата, является абьюзом игровых механик и категорически запрещено.
  ▹ 1.9. Запрещено передавать информацию об оставшихся тикетах, местах расположения хабов, техники, маршрутах и прочую, которая способна помешать победе Вашей команды.
  ▹ 1.10. Стримить разрешено только со “шторками”, закрывающими карту и тикеты.
\`\`\``
  );

  const embed1 = new EmbedBuilder().setColor("#2b2d31").setDescription(`
${centerText("**ИГРОВЫЕ ПРАВИЛА**")}

\`\`\`
  ▹ 2.1. Намеренное убийство союзников запрещено.
  ▹ 2.2. Запрещено уничтожение союзного радио (FOB), а также вывоз и использование с нее ресурсов без предварительного согласования с командой или командиром, поставившим данный FOB.
  ▹ 2.3. Уничтожение союзной техники/укреплений без предварительного согласования с командой запрещено.
  ▹ 2.4. Запрещено препятствовать клейму техники на мейне (сажать члена отряда в технику и удерживать ее, давить и блокировать союзников) и блокировать места появления техники.
  ▹ 2.5. Командир отряда обязан иметь микрофон, говорить по-русски и поддерживать связь в командирском канале по запросу.
  ▹ 2.6. Создание отряда и переброс роли командира без согласования запрещено. При ошибочном создании отряда необходимо его распустить.
  ▹ 2.7. Отряд в лице одного “Squad Leader” не может быть закрыт, кроме использования боевой легкой техники для фракций Irregular Militia и Insurgents.
  ▹ 2.8. Сквадной имеет право кикать бойцов на свое усмотрение без объяснения причин.
  ▹ 2.9. Приказы командира стороны (CMD) не обязательны к исполнению.
\`\`\``);

  const embed2 = new EmbedBuilder().setColor("#2b2d31").setDescription(`

${centerText("**ТЕРМИНОЛОГИЯ, ЧИСЛЕННОСТЬ И ПРИОРИТЕТ**")}

\`\`\`
  ▹ 3.1. Пехотные и технические отряды, выполняющие боевые задачи на актуальных игровых точках (атака/защита), имеют наивысший приоритет при снабжении ресурсами и распределении легкой техники.
  ▹ 3.2. Пехотный отряд - командир имеет снаряжение “Lead”, “Leader”. Численность от 2 до 9 человек.
  ▹ 3.3. Технический отряд - использует тяжелую технику, командир имеет снаряжение “Lead Crewman”. Численность до 9 человек.
  ▹ 3.4. Отряд поддержки - занимается ИСКЛЮЧИТЕЛЬНО блоком мейна/ПТУР/минометами/пушками. Численность до 6 человек.
Отряд из одного человека считается отрядом поддержки и имеет низший приоритет при распределении транспорта.
  ▹ 3.5. Отряд авиации - использует вертолет, командир имеет снаряжение “Lead pilot”. Численность до 4 человек.
  ▹ 3.6. Легкая техника - не требует снаряжения “Crewman”.
  ▹ 3.7. Тяжелая техника - требует снаряжения “Crewman”.
\`\`\``);

  const embed3 = new EmbedBuilder().setColor("#2b2d31").setDescription(`

${centerText("**ТЕХНИКА**")}

\`\`\`
  ▹ 4.1. Любая техника имеет большое значение, поэтому запрещено подвергать ее лишнему риску и безответственно к ней относиться.
  ▹ 4.2. Использование тяжелой техники разрешено только в количестве одной на отряд, с экипажем из командира со снаряжением "Lead Crewman" и минимум одного бойца со снаряжением “Crewman”, кроме случаев перемещения на мейн или ремонт.
  ▹ 4.3. Первоочередной задачей технического отряда при потере тяжелой техники является ее спасение. Запрещено использование другой тяжелой техники, если предыдущая находится вне мейна.
  ▹ 4.4. Использование вертолета разрешено только в количестве одного на отряд и командиром со снаряжением "Lead Pilot" в составе экипажа.
  ▹ 4.5. Запрещено использование вертолета без необходимых навыков управления.
  ▹ 4.6. Реклейм тяжелой техники без разрешения запрещен вне мейна, но на мейне разрешен.
  ▹ 4.7. Реклейм легкой техники, вертолета без разрешения запрещен в основной фазе матча и разрешен в стартовой.
\`\`\``);

  const embed4 = new EmbedBuilder().setColor("#2b2d31").setDescription(`

${centerText("**ОБРАТНАЯ СВЯЗЬ**")}

\`\`\`
  ▹ 5.1. Обратная связь осуществляется через дискорд сообщества discord.gg/rn-server.
  ▹ 5.2. В качестве доказательств нарушений правил сервера принимаются скрины, видео и ссылки на ютуб.
В дискорд – канале сервера (discord.gg/rn-server -> #создать-тикет) необходимо открыть тикет обращения и приложить доказательства нарушения.
При отсутствии доказательств администрации будет невозможно наказать виновного.
\`\`\``);

  const embed5 = new EmbedBuilder().setColor("#2b2d31").setDescription(`
  
${centerText("**АДМИНИСТРАЦИЯ**")}

\`\`\`
  ▹ 6.1. Окончательная трактовка правил сервера и их изменение остаются за администрацией проекта.
  ▹ 6.2. Сроки наказания за нарушение и сами нарушения фиксированными не являются и остаются на усмотрение администрации проекта.
  ▹ 6.3. Любым сбором средств на развитие проекта занимается только администрация проекта.
\`\`\`
`);
  await thread.send({ embeds: [embed] });
  await thread.send({ embeds: [embed1] });
  await thread.send({ embeds: [embed2] });
  await thread.send({ embeds: [embed3] });
  await thread.send({ embeds: [embed4] });
  await thread.send({ embeds: [embed5] });
}

async function squadv(channel) {
  await channel.threads.create({
    name: "Правила SQUADV",
    autoArchiveDuration: 60,
    message:
      "https://media.discordapp.net/attachments/1179711462197968896/1209953871066300477/4243234.png",
  });
  const thread = channel.threads.cache.find((x) => x.name === "Правила SQUADV");
  const embed = new EmbedBuilder().setColor("#2b2d31").setDescription(
    `
*Squad - командная игра. Мы поддерживаем действия, которые приносят пользу всей команде. При формировании своего плана на игру обращайте внимание на потребности команды и взаимодействуйте с другими игроками.*

${centerText("**ПРАВИЛА ПОВЕДЕНИЯ**")}

\`\`\`
  ▹ 1.1. Запрещено разжигание ненависти и конфликтов на политической, религиозной, половой, национальной или расовой почве.
  ▹ 1.2. Запрещены любые проявления экстремистского и противоправного характера. Это относится к устным и письменным выражениям, никнеймам и клан–тэгам, а также музыкальным композициям, запрещенным в РФ, проявлениям нетерпимости, отчуждения, ксенофобии, антисемитизма и ультранационализма.
  ▹ 1.3. Категорически запрещены:
    - читерство;
    - провокации;
    - оскорбления родственников, в том числе завуалированные;
    - неоднократные, продолжающиеся во времени оскорбления игроков;
    - негативные и неконструктивные высказывания в адрес сервера;
    - оскорбления сервера и администрации.
  ▹ 1.4. Запрещена реклама любых других проектов в любом ее виде.
  ▹ 1.5. Запрещено использование саундпада в командирском канале.
  ▹ 1.6. Запрещены никнеймы, состоящие из: иероглифов; цифр; фигурных символов или букв, которые Squad отображает как знаки вопроса; специальных символов; мата или других выражений, которые могут быть оскорбительными; а также не имеющие смысла.
  ▹ 1.7. Запрещено использование никнейма другого игрока или клан-тэга без разрешения.
  ▹ 1.8. Любое действие, использующее ошибки игры и направленное на достижение положительного результата, является абьюзом игровых механик и категорически запрещено.
  ▹ 1.9. Запрещено передавать информацию об оставшихся тикетах, местах расположения хабов, техники, маршрутах и прочую, которая способна помешать победе Вашей команды.
  ▹ 1.10. Стримить разрешено только со “шторками”, закрывающими карту и тикеты.
\`\`\``
  );

  const embed1 = new EmbedBuilder().setColor("#2b2d31").setDescription(`
${centerText("**ИГРОВЫЕ ПРАВИЛА**")}

\`\`\`
  ▹ 2.1. Намеренное убийство союзников запрещено.
  ▹ 2.2. Запрещено уничтожение союзного радио (FOB), а также вывоз и использование с нее ресурсов без предварительного согласования с командой или командиром, поставившим данный FOB.
  ▹ 2.3. Уничтожение союзной техники/укреплений без предварительного согласования с командой запрещено.
  ▹ 2.4. Запрещено препятствовать клейму техники на мейне (сажать члена отряда в технику и удерживать ее, давить и блокировать союзников) и блокировать места появления техники.
  ▹ 2.5. Командир отряда обязан иметь микрофон, говорить по-русски и поддерживать связь в командирском канале по запросу.
  ▹ 2.6. Создание отряда и переброс роли командира без согласования запрещено. При ошибочном создании отряда необходимо его распустить.
  ▹ 2.7. Отряд в лице одного “Squad Leader” не может быть закрыт, кроме использования боевой легкой техники для фракций Irregular Militia и Insurgents.
  ▹ 2.8. Сквадной имеет право кикать бойцов на свое усмотрение без объяснения причин.
  ▹ 2.9. Приказы командира стороны (CMD) не обязательны к исполнению.
\`\`\``);

  const embed2 = new EmbedBuilder().setColor("#2b2d31").setDescription(`

${centerText("**ТЕРМИНОЛОГИЯ, ЧИСЛЕННОСТЬ И ПРИОРИТЕТ**")}

\`\`\`
  ▹ 3.1. Пехотные и технические отряды, выполняющие боевые задачи на актуальных игровых точках (атака/защита), имеют наивысший приоритет при снабжении ресурсами и распределении легкой техники на мейне.
  ▹ 3.2. Пехотный отряд - командир имеет снаряжение “Lead”, “Leader”. Численность от 2 до 9 человек.
  ▹ 3.3. Технический отряд - использует тяжелую технику, командир имеет снаряжение “Lead Crewman”. Численность до 9 человек.
  ▹ 3.4. Отряд поддержки - занимается ИСКЛЮЧИТЕЛЬНО блоком мейна/ПТУР/минометами/пушками. Численность до 6 человек.
Отряд из одного человека считается отрядом поддержки и имеет низший приоритет при распределении транспорта на мейне.
  ▹ 3.5. Отряд авиации - использует вертолет, командир имеет снаряжение “Lead pilot”. Численность до 4 человек.
  ▹ 3.6. Легкая техника - не требует снаряжения “Crewman”.
  ▹ 3.7. Тяжелая техника - требует снаряжения “Crewman”.
\`\`\``);

  const embed3 = new EmbedBuilder().setColor("#2b2d31").setDescription(`

${centerText("**ТЕХНИКА**")}

\`\`\`
  ▹ 4.1. Любая техника имеет большое значение, поэтому запрещено подвергать ее лишнему риску и безответственно к ней относиться.
  ▹ 4.2. Использование тяжелой техники разрешено только в количестве одной на отряд, с экипажем из командира со снаряжением "Lead Crewman" и минимум одного бойца со снаряжением “Crewman”, кроме случаев перемещения на мейн или ремонт.
  ▹ 4.3. Первоочередной задачей технического отряда при потере тяжелой техники является ее спасение. Запрещено использование другой тяжелой техники, если предыдущая находится вне мейна.
  ▹ 4.4. Использование вертолета разрешено только в количестве одного на отряд и командиром со снаряжением "Lead Pilot" в составе экипажа.
  ▹ 4.4.1. Использование вертолета разрешено только в количестве одного на отряд и командиром со снаряжением "Lead Pilot" в составе экипажа.
  ▹ 4.4.2. Использование боевого вертолета (Ka52, AH64D, 武直-10, Mi24-V) разрешено только с экипажем из командира со снаряжением "Lead Pilot" и одного бойца со снаряжением “Pilot”, кроме случаев перемещения на мейн или ремонт.
  ▹ 4.5. Запрещено использование вертолета без необходимых навыков управления.
  ▹ 4.6. Реклейм тяжелой техники и боевого вертолета разрешен только в любом из следующих случаев:
     с согласия владельца;
     на мейне;
     при смерти экипажа.
  ▹ 4.7. Реклейм легкой техники, вертолета (кроме боевого) без разрешения запрещен в основной фазе матча и разрешен в стартовой.
\`\`\``);

  const embed4 = new EmbedBuilder().setColor("#2b2d31").setDescription(`

${centerText("**ОБРАТНАЯ СВЯЗЬ**")}

\`\`\`
  ▹ 5.1. Обратная связь осуществляется через дискорд сообщества discord.gg/rn-server.
  ▹ 5.2. В качестве доказательств нарушений правил сервера принимаются скрины, видео и ссылки на ютуб.
В дискорд – канале сервера (discord.gg/rn-server -> #создать-тикет) необходимо открыть тикет обращения и приложить доказательства нарушения.
При отсутствии доказательств администрации будет невозможно наказать виновного.
\`\`\``);

  const embed5 = new EmbedBuilder().setColor("#2b2d31").setDescription(`
  
${centerText("**АДМИНИСТРАЦИЯ**")}

\`\`\`
  ▹ 6.1. Окончательная трактовка правил сервера и их изменение остаются за администрацией проекта.
  ▹ 6.2. Сроки наказания за нарушение и сами нарушения фиксированными не являются и остаются на усмотрение администрации проекта.
  ▹ 6.3. Любым сбором средств на развитие проекта занимается только администрация проекта.
\`\`\`
`);
  await thread.send({ embeds: [embed] });
  await thread.send({ embeds: [embed1] });
  await thread.send({ embeds: [embed2] });
  await thread.send({ embeds: [embed3] });
  await thread.send({ embeds: [embed4] });
  await thread.send({ embeds: [embed5] });
}

async function squad(channel) {
  console.log("squad");

  await channel.threads.create({
    name: "Правила SQUAD",
    autoArchiveDuration: 60,
    message:
      "https://media.discordapp.net/attachments/1179711462197968896/1209974281564463236/decc05dd477148f1.png",
  });
  const thread = channel.threads.cache.find((x) => x.name === "Правила SQUAD");
  const embed = new EmbedBuilder().setColor("#2b2d31").setDescription(
    `
*Squad - командная игра. Мы поддерживаем действия, которые приносят пользу всей команде. При формировании своего плана на игру обращайте внимание на потребности команды и взаимодействуйте с другими игроками.*

${centerText("**ПРАВИЛА ПОВЕДЕНИЯ**")}

\`\`\`
  ▹ 1.1. Запрещено разжигание ненависти и конфликтов на политической, религиозной, половой, национальной или расовой почве.
  ▹ 1.2. Запрещены любые проявления экстремистского и противоправного характера. Это относится к устным и письменным выражениям, никнеймам и клан–тэгам, а также музыкальным композициям, запрещенным в РФ, проявлениям нетерпимости, отчуждения, ксенофобии, антисемитизма и ультранационализма.
  ▹ 1.3. Категорически запрещены:
    - читерство;
    - провокации;
    - оскорбления родственников, в том числе завуалированные;
    - неоднократные, продолжающиеся во времени оскорбления игроков;
    - негативные и неконструктивные высказывания в адрес сервера;
    - оскорбления сервера и администрации.
  ▹ 1.4. Запрещена реклама любых других проектов в любом ее виде.
  ▹ 1.5. Запрещено использование саундпада в командирском канале.
  ▹ 1.6. Запрещены никнеймы, состоящие из: иероглифов; цифр; фигурных символов или букв, которые Squad отображает как знаки вопроса; специальных символов; выражений, которые могут быть оскорбительными; а также не имеющие смысла.
  ▹ 1.7. Запрещено использование никнейма другого игрока или клан-тэга без разрешения.
  ▹ 1.8. Любое действие, использующее ошибки игры и направленное на достижение положительного результата, является абьюзом игровых механик и категорически запрещено.
  ▹ 1.9. Запрещено передавать информацию об оставшихся тикетах, местах расположения хабов, техники, маршрутах и прочую, которая способна помешать победе Вашей команды. Запрещено передавать и использовать такую информацию, если она была получена благодаря смене стороны или посредством тайной передачи от другой стороны.
  ▹ 1.10. Стримить разрешено только со “шторками”, закрывающими карту и тикеты.
\`\`\``
  );

  const embed1 = new EmbedBuilder().setColor("#2b2d31").setDescription(`
${centerText("**ИГРОВЫЕ ПРАВИЛА**")}

\`\`\`
  ▹ 2.1. Намеренное убийство союзников запрещено.
  ▹ 2.2. Запрещено уничтожение союзного радио (FOB), а также вывоз и использование с нее ресурсов без предварительного согласования с командой или командиром, поставившим данный FOB.
  ▹ 2.3. Уничтожение союзной техники/укреплений без предварительного согласования с командой запрещено.
  ▹ 2.4. Запрещено препятствовать клейму техники на мейне (сажать члена отряда в технику и удерживать ее, давить и блокировать союзников) и блокировать места появления техники.
  ▹ 2.5. Командир отряда обязан иметь микрофон, говорить по-русски и поддерживать связь в командирском канале по запросу.
  ▹ 2.6. Создание отряда и переброс роли командира без согласования запрещено. При ошибочном создании отряда необходимо его распустить.
  ▹ 2.7. Отряд в лице одного “Squad Leader” не может быть закрыт, кроме использования боевой легкой техники для фракций Irregular Militia и Insurgents.
  ▹ 2.8. Сквадной имеет право кикать бойцов на свое усмотрение без объяснения причин.
  ▹ 2.9. Приказы командира стороны (CMD) не обязательны к исполнению.
\`\`\``);

  const embed2 = new EmbedBuilder().setColor("#2b2d31").setDescription(`

${centerText("**ТЕРМИНОЛОГИЯ, ЧИСЛЕННОСТЬ И ПРИОРИТЕТ**")}

\`\`\`
  ▹ 3.1. Пехотные и технические отряды, выполняющие боевые задачи на актуальных игровых точках (атака/защита), имеют наивысший приоритет при снабжении ресурсами и распределении легкой техники на мейне.
  ▹ 3.2. Пехотный отряд - командир имеет снаряжение “Lead”, “Leader”. Численность от 2 до 9 человек.
  ▹ 3.3. Технический отряд - использует тяжелую технику, командир имеет снаряжение “Lead Crewman”. Численность до 9 человек.
  ▹ 3.4. Отряд поддержки - занимается ИСКЛЮЧИТЕЛЬНО блоком мейна/ПТУР/минометами/пушками. Численность до 6 человек.
Отряд из одного человека считается отрядом поддержки и имеет низший приоритет при распределении транспорта на мейне.
  ▹ 3.5. Отряд авиации - использует вертолет, командир имеет снаряжение “Lead pilot”. Численность до 4 человек.
  ▹ 3.6. Легкая техника - не требует снаряжения “Crewman”.
  ▹ 3.7. Тяжелая техника - требует снаряжения “Crewman”.
\`\`\``);

  const embed3 = new EmbedBuilder().setColor("#2b2d31").setDescription(`

${centerText("**ТЕХНИКА**")}

\`\`\`
  ▹ 4.1. Любая техника имеет большое значение, поэтому запрещено подвергать ее лишнему риску и безответственно к ней относиться.
  ▹ 4.2. Использование тяжелой техники разрешено только в количестве одной на отряд, с экипажем из командира со снаряжением "Lead Crewman" и минимум одного бойца со снаряжением “Crewman”, кроме случаев перемещения на мейн или ремонт.
  ▹ 4.3. Первоочередной задачей технического отряда при потере тяжелой техники является ее спасение. Запрещено использование другой тяжелой техники, если предыдущая находится вне мейна.
  ▹ 4.4. Использование вертолета разрешено только в количестве одного на отряд и командиром со снаряжением "Lead Pilot" в составе экипажа.
  ▹ 4.5. Запрещено использование вертолета без необходимых навыков управления.
  ▹ 4.6. Реклейм тяжелой техники без разрешения запрещен вне мейна, но на мейне разрешен.
  ▹ 4.7. Реклейм легкой техники, вертолета разрешен только в стартовой фазе матча. В основной фазе такой реклейм запрещён, за исключением случаев, когда техника находится на мейне, но на мейне нет никого из членов отряда-владельца.
\`\`\``);

  const embed4 = new EmbedBuilder().setColor("#2b2d31").setDescription(`

${centerText("**ОБРАТНАЯ СВЯЗЬ**")}

\`\`\`
  ▹ 5.1. Обратная связь осуществляется через дискорд сообщества discord.gg/rn-server.
  ▹ 5.2. В качестве доказательств нарушений правил сервера принимаются скрины, видео и ссылки на ютуб.
В дискорд – канале сервера (discord.gg/rn-server -> #создать-тикет) необходимо открыть тикет обращения и приложить доказательства нарушения.
При отсутствии доказательств администрации будет невозможно наказать виновного.
\`\`\``);

  const embed5 = new EmbedBuilder().setColor("#2b2d31").setDescription(`
  
${centerText("**АДМИНИСТРАЦИЯ**")}

\`\`\`
  ▹ 6.1. Окончательная трактовка правил сервера и их изменение остаются за администрацией проекта.
  ▹ 6.2. Сроки наказания за нарушение и сами нарушения фиксированными не являются и остаются на усмотрение администрации проекта.
  ▹ 6.3. Любым сбором средств на развитие проекта занимается только администрация проекта.
\`\`\`
`);
  await thread.send({ embeds: [embed] });
  await thread.send({ embeds: [embed1] });
  await thread.send({ embeds: [embed2] });
  await thread.send({ embeds: [embed3] });
  await thread.send({ embeds: [embed4] });
  await thread.send({ embeds: [embed5] });
}

async function vip(channel) {
  console.log("vip");

  // 1) Отправляем первое изображение
  await channel.send({
    files: ["./img/image1.png"],
  });

  // 2) Создаём эмбеды
  const embed = new EmbedBuilder().setColor("#008000").setDescription(`
⠀⠀Уважаемые игроки Русского Народного Сервера,
с глубокой благодарностью за вашу щедрость и поддержку, мы рады предоставить вам **VIP** статус, который будет доступен на всех наших игровых серверах.

**VIP** статус предоставляет вам уникальные преимущества:
⠀⠀⠀⠀○ приоритетный доступ на игровой сервер, без необходимости ожидания в общей очереди;
⠀⠀⠀⠀○ голосование за карты;
Также несколько дополнительных привилегий на нашем сервере в Discord :
⠀⠀⠀⠀○ отдельная **VIP** роль;
⠀⠀⠀⠀○ отдельный **VIP** чат;
⠀⠀⠀⠀○ доступ к подробной игровой статистике.
`);

  const embed1 = new EmbedBuilder().setColor("#008000").setDescription(`
⠀За каждые **300 рублей** вашей поддержки мы предоставляем **VIP** статус со сроком действия 1 месяц.
⠀Кроме того, за поддержку в размере **2000 рублей** мы готовы предоставить вам на 1 месяц клановый **VIP** статус (не более 30 человек в клане).

⠀Чтобы сделать пожертвование и получить **VIP** статус, нажмите на кнопку **VIP статус за донат**.
`);

  const embed2 = new EmbedBuilder().setColor("#008000").setDescription(`
⠀В награду за активность на наших игровых серверах, мы поощряем игроков предоставлением **VIP** статуса. Для этого в игре действует система бонусных баллов.
⠀Каждому игроку начисляется 1 бонусный балл за 1 минуту, проведенную на игровом сервере, на обычной карте и 2 бонусных балла за 1 минуту на seed-карте.
⠀За каждые **15000** бонусных баллов можно активировать **VIP** статус сроком на 1 месяц. Узнать количество начисленных бонусных баллов можно в игре на нашем сервере, написав в чат команду "!bonus".

⠀Чтобы активировать **VIP** за бонусные баллы, нажмите на кнопку **VIP статус за бонусные баллы**.

⠀Пожалуйста, обратите внимание, что **VIP** статус в игре начнет действовать только после смены карты на сервере!
`);

  // 3) Отправляем эмбеды
  await channel.send({ embeds: [embed] });
  await channel.send({ embeds: [embed1] });
  await channel.send({ embeds: [embed2] });

  // 4) Отправляем второе изображение
  await channel.send({
    files: ["./img/image2.png"],
  });

  // 5) Создаём кнопки
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("donatVip")
      .setLabel("VIP статус за донат")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("bonusVip")
      .setLabel("VIP статус за бонусные баллы")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("checkVip")
      .setLabel("Проверить VIP статус")
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({
    components: [row],
  });
}

export default rulesSquad;
