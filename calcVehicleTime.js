async function calcVehicleTime(possess) {
  const heavyVehicle = [
    "ZTZ99",
    "T72B3",
    "T62",
    "M1A1",
    "AUS",
    "M1A2",
    "2A6",
    "FV4034",
    "ZBD04A",
    "FV510UA",
    "FV510",
    "BFV",
    "BMP2",
    "BMP1",
    "MTLB",
    "FV107",
    "FV432",
    "AAVP7A1",
    "ZSL10",
    "ZBL08",
    "ZSL10",
    "M1126",
    "M113A3",
    "LAV",
    "LAV6",
    "CROWS",
    "ASLAV",
    "LAV2",
    "LAV25",
    "BTR82A",
    "BTR80",
    "Sprut",
    "BMD4M",
    "BMD1M",
    "ZTD05",
    "ZBD05",
  ];
  const heliVehicle = [
    "Z8G",
    "CH146",
    "MRH90",
    "SA330",
    "MI8",
    "UH60",
    "UH60",
    "UH1Y",
    "MI17",
    "Z8J",
  ];
  let heliTime = 0;
  let heavyTime = 0;

  for (let key in possess) {
    if (heliVehicle.includes(key.split("_")[1])) {
      heliTime = heliTime + possess[key];
    }

    if (heavyVehicle.includes(key.split("_")[1])) {
      heavyTime = heavyTime + possess[key];
    }
  }

  return [heavyTime, heliTime];
}
export default calcVehicleTime;
