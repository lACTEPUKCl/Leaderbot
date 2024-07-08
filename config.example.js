const options = {
  // ID вашего сервера (Guild ID)
  discordServerId: "735515208348598292",

  // ID пользователя для уведомления (при использовании клан лидерами команд /addtoclanvip /removefromclanvip)
  idForNotification: "",

  // Путь до файла Admin.cfg
  adminsCfgPath: "C:/Users/Admin/Desktop/",

  //Имя VIP роли
  vipRoleName: "",

  //ID VIP роли
  vipRoleID: "",

  // ID канала для VIP пользователей
  vipChannelId: "123456789012345678",

  // ID канала для выдачи VIP вручную
  vipManualChannelId: "",

  // Сообщение о завершении VIP статуса
  vipExpiredMessage:
    "Ваш Vip статус на сервере RNS закончился, для продления вип статуса перейдите по ссылке",

  // Интервал для проверки новых донатов (в миллисекундах)
  donationCheckInterval: 60000, // 1 минута

  // ID канала войдя в который будет создаваться новый канал
  channelIdToCreateChannel: "",
  // ID категории в которой находится этот канал
  categoryIdForCreateChannel: "",
  // Точные названия ролей администраторов которым будет виден созданный канал
  adminsRoleName: ["", ""],
  // Точное название роли бота
  botRoleName: "",

  // Сылка на донат
  donationLink: "",

  // Имя базы данных
  dbName: "",
  // Имя коллекции базы данных
  dbCollection: "",

  // Путь до файла syncconfig.sh
  syncconfigPath: "C:/Users/Admin/Desktop/",

  // Сумма доната за месяц VIP
  sumPerMonth: 150,

  // Название VIP группы в файле Admins.cfg
  vipGroupName: "",

  // Максимум в игроков в клановой випке
  maxClanVipUsers: 30,
};

export default options;
