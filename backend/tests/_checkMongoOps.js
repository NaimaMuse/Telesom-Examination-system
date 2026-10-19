const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
  });
  const db = mongoose.connection.db;
  let ops;
  try {
    ops = await db.admin().command({ currentOp: true });
  } catch (error) {
    console.log('currentOp_failed', error.message);
    ops = await db.command({ currentOp: 1 });
  }
  const inProgress = (ops.inprog || []).filter((op) => {
    const ns = op.ns || '';
    return ns.includes('telesom') || op.secs_running > 2;
  });
  console.log('op_count', (ops.inprog || []).length);
  console.log(
    JSON.stringify(
      inProgress.map((op) => ({
        ns: op.ns,
        secs: op.secs_running,
        op: op.op,
        command: op.command && Object.keys(op.command).slice(0, 6),
        msg: op.msg,
      })),
      null,
      2
    )
  );
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
