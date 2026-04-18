import {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType,
} from "discord.js";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mapsRaw = await readFile(path.join(__dirname, "../maps.json"), "utf-8");
const mapsData = JSON.parse(mapsRaw);
const mapNames = Object.keys(mapsData);

const TIMEOUT_MS = 60_000;

const votemapCommand = new SlashCommandBuilder()
  .setName("votemap")
  .setDescription("Собрать строку голосования за карту");

votemapCommand.addStringOption((option) =>
  option
    .setName("map")
    .setDescription("Название карты (начните вводить для поиска)")
    .setRequired(true)
    .setAutocomplete(true)
);

/**
 * Возвращает плоский список фракций для карты:
 * [{ group: "BLUFOR", faction: "USA", types: ["Armored", ...] }, ...]
 */
function getFactionsForMap(mapName) {
  const teamData = mapsData[mapName]?.["Team1 / Team2"];
  if (!teamData) return [];
  const result = [];
  for (const [group, subfactions] of Object.entries(teamData)) {
    for (const [faction, types] of Object.entries(subfactions)) {
      result.push({ group, faction, types });
    }
  }
  return result;
}

/**
 * Создаёт select-меню для выбора фракции
 */
function buildFactionMenu(customId, placeholder, factions) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .addOptions(
      factions.map((f) => ({
        label: f.faction,
        description: f.group,
        value: f.faction,
      }))
    );
  return new ActionRowBuilder().addComponents(menu);
}

/**
 * Создаёт select-меню для выбора типа войск
 */
function buildUnitTypeMenu(customId, placeholder, types) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .addOptions(
      types.map((t) => ({
        label: t,
        value: t,
      }))
    );
  return new ActionRowBuilder().addComponents(menu);
}

/**
 * Ожидает выбор пользователя в select-меню
 */
async function awaitSelect(reply, interaction, customId) {
  try {
    const i = await reply.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: (i) =>
        i.customId === customId && i.user.id === interaction.user.id,
      time: TIMEOUT_MS,
    });
    return i;
  } catch {
    return null;
  }
}

const autocomplete = async (interaction) => {
  const focused = interaction.options.getFocused().toLowerCase();
  const filtered = mapNames
    .filter((m) => m.toLowerCase().includes(focused))
    .slice(0, 25);
  await interaction.respond(
    filtered.map((m) => ({ name: m, value: m }))
  );
};

const execute = async (interaction) => {
  const mapName = interaction.options.getString("map");

  if (!mapsData[mapName]) {
    return interaction.reply({
      content: `Карта **${mapName}** не найдена в maps.json.`,
      ephemeral: true,
    });
  }

  const allFactions = getFactionsForMap(mapName);

  // ── Шаг 1: Фракция 1 ──
  const row1 = buildFactionMenu(
    "votemap_f1",
    "Фракция 1",
    allFactions
  );

  const reply = await interaction.reply({
    content: `🗺️ **${mapName}**\n\n**Шаг 1/4** — Выберите фракцию 1:`,
    components: [row1],
    ephemeral: true,
  });

  const f1i = await awaitSelect(reply, interaction, "votemap_f1");
  if (!f1i) {
    return interaction.editReply({
      content: "⏰ Время вышло. Попробуйте ещё раз.",
      components: [],
    });
  }
  const faction1Name = f1i.values[0];
  const faction1 = allFactions.find((f) => f.faction === faction1Name);

  // ── Шаг 2: Тип войск для фракции 1 ──
  const row2 = buildUnitTypeMenu(
    "votemap_t1",
    `Тип войск для ${faction1Name}`,
    faction1.types
  );

  await f1i.update({
    content: `🗺️ **${mapName}**\n✅ Фракция 1: **${faction1Name}** (${faction1.group})\n\n**Шаг 2/4** — Тип войск для ${faction1Name}:`,
    components: [row2],
  });

  const t1i = await awaitSelect(reply, interaction, "votemap_t1");
  if (!t1i) {
    return interaction.editReply({
      content: "⏰ Время вышло. Попробуйте ещё раз.",
      components: [],
    });
  }
  const type1Name = t1i.values[0];

  // ── Шаг 3: Фракция 2 ──
  const row3 = buildFactionMenu(
    "votemap_f2",
    "Фракция 2",
    allFactions
  );

  await t1i.update({
    content: `🗺️ **${mapName}**\n✅ Команда 1: **${faction1Name}+${type1Name}**\n\n**Шаг 3/4** — Выберите фракцию 2:`,
    components: [row3],
  });

  const f2i = await awaitSelect(reply, interaction, "votemap_f2");
  if (!f2i) {
    return interaction.editReply({
      content: "⏰ Время вышло. Попробуйте ещё раз.",
      components: [],
    });
  }
  const faction2Name = f2i.values[0];
  const faction2 = allFactions.find((f) => f.faction === faction2Name);

  // ── Шаг 4: Тип войск для фракции 2 ──
  const row4 = buildUnitTypeMenu(
    "votemap_t2",
    `Тип войск для ${faction2Name}`,
    faction2.types
  );

  await f2i.update({
    content: `🗺️ **${mapName}**\n✅ Команда 1: **${faction1Name}+${type1Name}**\n✅ Фракция 2: **${faction2Name}** (${faction2.group})\n\n**Шаг 4/4** — Тип войск для ${faction2Name}:`,
    components: [row4],
  });

  const t2i = await awaitSelect(reply, interaction, "votemap_t2");
  if (!t2i) {
    return interaction.editReply({
      content: "⏰ Время вышло. Попробуйте ещё раз.",
      components: [],
    });
  }
  const type2Name = t2i.values[0];

  // ── Результат ──
  const result = `!votemap ${mapName} ${faction1Name}+${type1Name} ${faction2Name}+${type2Name}`;

  await t2i.update({
    content:
      `✅ Готово! Скопируйте команду:\n\n` +
      `\`\`\`\n${result}\n\`\`\`\n\n` +
      `🗺️ **${mapName}**\n` +
      `⚔️ Команда 1: **${faction1Name}** (${faction1.group}) — ${type1Name}\n` +
      `⚔️ Команда 2: **${faction2Name}** (${faction2.group}) — ${type2Name}`,
    components: [],
  });
};

export default { data: votemapCommand, execute, autocomplete };
