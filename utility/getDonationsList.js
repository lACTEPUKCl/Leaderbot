import { MongoClient } from "mongodb";

async function connectToMongoDB(dbLink) {
  const client = new MongoClient(dbLink);
  try {
    await client.connect();
    return client;
  } catch (err) {
    console.error("Ошибка при подключении к MongoDB:", err.message);
    throw err;
  }
}

async function getDonationsListFromDB(dbLink) {
  const client = await connectToMongoDB(dbLink);

  try {
    const db = client.db("vip");
    const collection = db.collection("donuts");
    const donations = await collection.find().toArray();
    const formattedDonations = donations.map((donation) => ({
      uid: donation._id,
      date: donation.date,
      message: donation.message,
      nickname: donation.nickname,
      sum: donation.sum,
      submit: donation.submit,
    }));

    return formattedDonations;
  } catch (error) {
    console.error(
      "Произошла ошибка при получении списка донатов из базы данных:",
      error
    );
    throw error;
  } finally {
    await client.close();
  }
}

export default getDonationsListFromDB;
