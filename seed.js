require('dotenv').config();
const fs = require('fs');
const { MongoClient } = require('mongodb');

async function main() {
  const items = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const manga = client.db('mangasite').collection('manga');

    const existing = await manga.countDocuments();
    if (existing > 0) {
      console.log(`The database already has ${existing} manga. Stopping so nothing gets duplicated.`);
      return;
    }

    const result = await manga.insertMany(items);
    console.log(`Imported ${result.insertedCount} manga.`);
  } catch (err) {
    console.error('Import failed:', err.message);
  } finally {
    await client.close();
  }
}

main();