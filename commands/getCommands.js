import path from "node:path";
import { fileURLToPath } from "url";
import fs from "node:fs/promises";

const currentFileUrl = import.meta.url;
const currentFilePath = fileURLToPath(currentFileUrl);
const currentFileName = path.basename(currentFilePath);

export default async function getCommands() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const files = await fs.readdir(path.join(__dirname, "./"));

  const plugins = [];
  for (const file of files) {
    if (!file.endsWith(".js") || file === currentFileName) continue;
    try {
      const command = await import(`./${file}`);

      if (command.default) {
        plugins.push(command.default);
      }
    } catch (err) {
      console.error(`Error importing ${file}: ${err.message}`);
    }
  }

  return plugins;
}
