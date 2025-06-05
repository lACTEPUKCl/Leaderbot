import { SlashCommandBuilder } from "discord.js";

const ball = new SlashCommandBuilder()
  .setName("ball")
  .setDescription("Задаёт вопрос шарику судьбы")
  .addStringOption((option) =>
    option
      .setName("вопрос")
      .setDescription("Ваш вопрос для шара судьбы")
      .setRequired(true)
  );

const responses = [
  "Бесспорно",
  "Предрешено",
  "Никаких сомнений",
  "Определённо да",
  "Можешь быть уверен в этом",
  "Мне кажется — да",
  "Вероятнее всего",
  "Хорошие перспективы",
  "Знаки говорят — да",
  "Да",
  "Пока не ясно, попробуй снова",
  "Спроси позже",
  "Лучше не рассказывать",
  "Сейчас нельзя предсказать",
  "Сконцентрируйся и спроси опять",
  "Даже не думай",
  "Мой ответ — нет",
  "По моим данным — нет",
  "Перспективы не очень хорошие",
  "Весьма сомнительно",
];

const execute = async (interaction) => {
  const randomIndex = Math.floor(Math.random() * responses.length);
  const answer = responses[randomIndex];

  await interaction.reply(`**${answer}**`);
};

export default { data: ball, execute };
