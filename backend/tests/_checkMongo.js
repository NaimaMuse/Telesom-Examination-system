const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI || '';
const host = uri.includes('@') ? uri.split('@')[1].split('/')[0] : uri.split('://')[1];

console.log('URI_SET=' + Boolean(uri));
console.log('HOST=' + host);
console.log('JWT_SET=' + Boolean(process.env.JWT_SECRET));

mongoose
  .connect(uri, { serverSelectionTimeoutMS: 8000 })
  .then(() => {
    console.log('MONGO_OK');
    return mongoose.disconnect();
  })
  .catch((error) => {
    console.log('MONGO_FAIL=' + error.message);
    process.exit(1);
  });
