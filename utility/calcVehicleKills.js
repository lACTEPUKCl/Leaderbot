async function calcVehicleKills(weapons) {
  const heavyVehicle = [
    "_pg9v_",
    "_White_ZU23_",
    "_M2_Technical_",
    "_S5_Proj2_",
    "_DShK_Technical_",
    "_QJY88_CTM131_",
    "_QJZ89_CTM131_",
    "_Kord_Safir_",
    "_MG3_DoorGun_",
    "_CROWS_M2_",
    "_50Cal_M1151_",
    "_50Cal_LUVW_",
    "_C6_LUVW_",
    "_M240_Loaders_",
    "_CROWS_M240_",
    "_GPMG_",
    "_RWS_M2_",
    "_Mag58_Bushmaser_",
    "_Kord_Tigr_",
    "_Arbalet_Kord_",
    "_BTR80_",
    "_BRDM2_",
    "_QJZ89_RWS_",
    "_QJZ89_CSK131_",
    "_QJY88_CSK131_",
    "_BTR82A_",
    "_30mm_",
    "LAV25_",
    "Coyote_",
    "ASLAV_",
    "_LAV_762_",
    "_LAV_C6_",
    "_RWS_C6_",
    "_TLAV_M2_",
    "_ZBL08_",
    "_HJ73_",
    "_Cupola_QJZ89_",
    "_AAVP7A1_M2_",
    "_40MM_MK19_",
    "_FV432_",
    "_EnforcerRWS_",
    "_MTLB_",
    "_23mm_",
    "_Scimitar_Rarden_",
    "_BMP1_",
    "_ZBD04A_",
    "_Refleks_Proj2_",
    "_100mm_Frag_",
    "_Warrior_",
    "_40mm_",
    "BFV_",
    "_Konkurs_",
    "_BMP2_",
    "_BMD4M_",
    "_BMD1M_",
    "_Kord_BTR-D_",
    "_PK_RWS_Gun_",
    "_Sprut_",
    "_2A45_",
    "_125mm_",
    "_ZPT-98_",
    "_2A46_",
    "_Cupola_Dshk_",
    "_2A20_",
    "_115mm_",
    "_M256A1_",
    "_L55_",
    "_L30A1_",
    "_L94A1_",
    "_BM21_",
    "_120mm_",
  ];

  // Используем метод reduce для вычисления общей суммы
  const totalSum = heavyVehicle.reduce((sum, vehicle) => {
    // Используем метод Object.keys() для получения всех ключей объекта weapons
    const keys = Object.keys(weapons);
    // Фильтруем ключи, чтобы найти те, которые содержат название техники из heavyVehicle
    const matchingKeys = keys.filter((key) => key.includes(vehicle));
    // Суммируем значения для найденных ключей и добавляем к текущей сумме
    const sumForVehicle = matchingKeys.reduce((vehicleSum, key) => {
      return vehicleSum + weapons[key];
    }, 0);
    // Добавляем сумму для текущей техники к общей сумме
    return sum + sumForVehicle;
  }, 0);

  // Выводим общую сумму
  return totalSum;
}

export default calcVehicleKills;
