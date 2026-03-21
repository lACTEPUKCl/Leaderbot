const FACTION_FLAGS = {
  RGF: "ru_flag_small.png",
  VDV: "ru_flag_small.png",
  RUS: "ru_flag_small.png",
  USA: "usa_flag_small.png",
  USMC: "usmc_flag_small.png",
  USMCW: "usmc_flag_small.png",
  BAF: "baf_flag_small.png",
  GB: "baf_flag_small.png",
  CAF: "caf_flag_small.png",
  CRF: "crf_flag_small.png",
  ADF: "adf_flag_small.png",
  AUS: "adf_flag_small.png",
  PLA: "pla_flag_small.png",
  PLANMC: "pla_flag_small.png",
  PLAAGF: "plaagf_flag_small.png",
  MEA: "mei_flag_small.png",
  MEI: "mei_flag_small.png",
  INS: "imf_flag_small.png",
  ISIS: "imf_flag_small.png",
  IMF: "imf_flag_small.png",
  MIL: "imf_flag_small.png",
  TKC: "imf_flag_small.png",
  TLF: "tlf_flag_small.png",
  AFU: "afu_flag_small.png",
  UAF: "afu_flag_small.png",
  UAFM: "afu_flag_small.png",
  GFI: "gfi_flag_small.png",
  WPMC: "wpmc_flag_small.png",
  SAF: "neutral_flag_small.png",
  HR: "neutral_flag_small.png",
  IB: "neutral_flag_small.png",
  SAS: "baf_flag_small.png",
  IRANRG: "mei_flag_small.png",
  ANA: "neutral_flag_small.png",
  GBE: "baf_flag_small.png",
  75: "usa_flag_small.png",
  USEC: "usa_flag_small.png",
};

export function getFactionFlag(faction) {
  if (!faction) return "neutral_flag_small.png";
  const upper = faction.toUpperCase();
  return FACTION_FLAGS[upper] || "neutral_flag_small.png";
}

export function parseFactions(layerStr) {
  if (!layerStr) return { team1: null, team2: null, map: null };

  const mapMatch = layerStr.match(/^([^_\s]+)/);
  const map = mapMatch ? mapMatch[1] : null;
  const factionsMatch = layerStr.match(/factions\s+(\S+)\s+(\S+)/);
  if (!factionsMatch) {
    return { team1: null, team2: null, map };
  }

  const team1 = factionsMatch[1].split("+")[0];
  const team2 = factionsMatch[2].split("+")[0];

  return { team1, team2, map };
}

export function getMapName(layerStr) {
  if (!layerStr) return "???";
  const commaIdx = layerStr.indexOf(",");
  const layerPart = commaIdx > -1 ? layerStr.substring(0, commaIdx) : layerStr;
  return layerPart.replace(/_/g, " ");
}

export function parseGameMode(layerStr) {
  if (!layerStr) return "";
  const newMatch = layerStr.match(/^[^_]+_([A-Za-z]+)_v\d/);
  if (newMatch) return newMatch[1].toUpperCase();
  const oldMatch = layerStr.match(/^\S+\s+(\S+)\s+v\d/);
  if (oldMatch) return oldMatch[1];
  return "";
}

export default {
  getFactionFlag,
  parseFactions,
  getMapName,
  parseGameMode,
  FACTION_FLAGS,
};
