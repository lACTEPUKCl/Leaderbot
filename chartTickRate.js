import { createCanvas, registerFont } from "canvas";
import { MongoClient } from "mongodb";
import { config } from "dotenv";
import { writeFile } from "fs/promises";
import { AttachmentBuilder } from "discord.js";
config();

const canvasWidth = 2540;
const canvasHeight = 600;
const margin = 50; // Уменьшил отступ

// Загрузка и регистрация шрифта
registerFont("./img/Tektur-Regular.ttf", { family: "MyFont" }); // Замените "путь_к_шрифту.ttf" на путь к вашему шрифту

// Объект для хранения цветов, привязанных к именам
const nameColors = {};
let nameCounts = {}; // Переменная для хранения количества выводов имен

// Функция для получения случайного цвета
function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Функция для получения цвета по имени
function getColorForName(name) {
  if (name in nameColors) {
    return nameColors[name];
  } else {
    const color = getRandomColor();
    nameColors[name] = color;
    return color;
  }
}

async function drawChart(dataPoints, canvas) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";

  // Определение параметров графика
  const chartWidth = canvasWidth - 2 * margin;
  const chartHeight = canvasHeight - 2 * margin;
  const minValue = 0;
  const maxValue = 60;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Отрисовка горизонтальных линий и отметок
  const stepY = chartHeight / 12;
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const y = canvasHeight - margin - i * stepY;
    ctx.moveTo(margin, y);
    ctx.lineTo(canvasWidth - margin, y);

    // Подписи к отметкам
    if (i % 2 === 0) {
      ctx.font = "10px MyFont"; // Увеличил размер шрифта на 2 пикселя
      ctx.fillStyle = "white"; // Изменил цвет цифр на белый
      ctx.fillText((i * 5).toString(), margin - 20, y + 2); // Подправил координаты отметок
    }
  }
  ctx.strokeStyle = "#ccc";
  ctx.stroke();

  // Отрисовка осей
  ctx.beginPath();
  ctx.moveTo(margin, margin);
  ctx.lineTo(margin, canvasHeight - margin);
  ctx.lineTo(canvasWidth - margin, canvasHeight - margin);
  ctx.stroke();

  // Отрисовка столбчатой гистограммы
  const stepX = chartWidth / dataPoints.length;
  ctx.lineWidth = stepX / 2;

  // Обнуляем объект с количеством выводов имен перед каждым выводом
  nameCounts = {};

  for (let i = 0; i < dataPoints.length; i++) {
    const dataPoint = dataPoints[i];
    const valueHeight =
      ((dataPoint.value - minValue) / (maxValue - minValue)) * chartHeight;
    const x = margin + i * stepX + stepX / 4; // Сдвигаем на половину ширины столбца
    const y = canvasHeight - margin - valueHeight;
    const height = valueHeight;

    ctx.fillStyle = getColorForName(dataPoint.name);

    // Заполняем столбец без обводки
    ctx.fillRect(x, y, stepX / 2, height);

    // Выводим имена над столбцами
    ctx.font = "15px MyFont";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const nameY = 45;

    // Проверяем, было ли имя уже выведено
    if (!(dataPoint.name in nameCounts) || nameCounts[dataPoint.name] === 0) {
      // Если имя уже было выведено, ищем группу столбцов одного цвета
      let groupStartIndex = i;
      while (
        groupStartIndex > 0 &&
        dataPoints[groupStartIndex - 1].name === dataPoint.name
      ) {
        groupStartIndex--;
      }
      let groupEndIndex = i;
      while (
        groupEndIndex < dataPoints.length - 1 &&
        dataPoints[groupEndIndex + 1].name === dataPoint.name
      ) {
        groupEndIndex++;
      }

      const groupWidth = (groupEndIndex - groupStartIndex + 1) * stepX;
      const groupNameX = margin + groupStartIndex * stepX + groupWidth / 2;
      ctx.fillText(dataPoint.name, groupNameX, nameY);

      // Обновляем счетчик для этой группы
      for (let j = groupStartIndex; j <= groupEndIndex; j++) {
        nameCounts[dataPoints[j].name] = 1;
      }
    } else {
      nameCounts[dataPoint.name]++;
    }
  }

  // Отрисовка времени и вертикальных меток на оси X
  ctx.font = "10px MyFont"; // Уменьшил размер шрифта времени на 3 пикселя
  ctx.fillStyle = "white"; // Цвет времени - белый
  ctx.textAlign = "center";
  ctx.textBaseline = "top"; // Текст будет начинаться от верхнего края
  const halfHourStep = Math.floor(dataPoints.length / 12); // Шаг в полчаса (по 12 отметок на графике)
  for (let i = 0; i < dataPoints.length; i += halfHourStep) {
    const dataPoint = dataPoints[i];
    const x = margin + i * stepX + stepX / 2;
    const y = canvasHeight - margin + 5; // Смещение времени вниз от оси X
    const timestamp = dataPoint.timestamp
      .toISOString()
      .split("T")[1]
      .slice(0, 5); // Форматирование времени без секунд
    ctx.save();
    ctx.translate(x, y);
    ctx.fillText(timestamp, 0, 0);
    ctx.restore();

    // Отрисовка вертикальной линии
    ctx.beginPath();
    ctx.moveTo(x, margin);
    ctx.lineTo(x, canvasHeight - margin);
    ctx.strokeStyle = "#ccc";
    ctx.stroke();
  }
}

async function fetchDataFromMongoDB(serverId) {
  const uri = process.env.DATABASE_URL;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db("SquadJS");
    const collection = database.collection("serverinfo");
    console.log(`server` + serverId);
    const mongoData = await collection.findOne({ _id: `server` + serverId });
    return mongoData.tickRate.map(([date, name, value]) => ({
      timestamp: new Date(date),
      name,
      value,
    }));
  } catch (err) {
    console.error("Ошибка при подключении к MongoDB:", err);
    return [];
  } finally {
    await client.close();
  }
}

async function createChart({ channel, serverId, messageId, seconds }) {
  console.log(serverId);
  setTimeout(async () => {
    // Получение данных из MongoDB
    const dataPoints = await fetchDataFromMongoDB(serverId);

    // Отрисовка гистограммы
    const canvas = createCanvas(canvasWidth, canvasHeight);
    drawChart(dataPoints, canvas);
    await saveChartAsImage(canvas, "histogram.png", channel, messageId);
  }, seconds);
}

async function saveChartAsImage(canvas, filename, channel, messageId) {
  try {
    const message = await channel.messages.fetch(messageId);
    const buffer = canvas.toBuffer("image/png");
    await writeFile(filename, buffer);

    const imageToSend = new AttachmentBuilder("histogram.png");
    message.edit({ files: [imageToSend] });
  } catch (err) {
    console.error("Ошибка при сохранении гистограммы:", err);
  }
}

export default createChart;
