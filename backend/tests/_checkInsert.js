const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
  });
  const db = mongoose.connection.db;
  const names = await db.listCollections().toArray();
  console.log(
    'collections',
    names.map((item) => item.name)
  );
  const count = await db.collection('users').countDocuments();
  console.log('user_count', count);
  const result = await db.collection('users').insertOne(
    {
      name: 'Native Insert Check',
      email: `native.${Date.now()}@telesom.local`,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { maxTimeMS: 5000 }
  );
  console.log('inserted', String(result.insertedId));
  await db.collection('users').deleteOne({ _id: result.insertedId });
  console.log('deleted');
  await mongoose.disconnect();
})().catch((error) => {
  console.error('FAIL', error);
  process.exit(1);
});
