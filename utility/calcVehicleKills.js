import { groupWeapons, calcVehicleKillsFromGrouped } from "./weaponMapping.js";

async function calcVehicleKills(weapons) {
  const grouped = groupWeapons(weapons);
  return calcVehicleKillsFromGrouped(grouped);
}

export default calcVehicleKills;
