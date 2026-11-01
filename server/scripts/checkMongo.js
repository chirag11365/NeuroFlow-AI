import mongoose from 'mongoose';
import { getMongoConnectionUri } from '../src/services/mongoConnection.js';
import { env } from '../src/config/env.js';

if (!env.mongoUri) {
  console.error('MONGODB_URI is not set. Add it to the project root .env file.');
  process.exit(1);
}

try {
  const connectionUri = await getMongoConnectionUri();
  await mongoose.connect(connectionUri, {
    serverSelectionTimeoutMS: 12000,
    connectTimeoutMS: 10000,
    family: 4
  });
  console.log(`MongoDB connection succeeded (${mongoose.connection.host}/${mongoose.connection.name}).`);
  await mongoose.disconnect();
} catch (error) {
  const message = String(error.message || error).replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, '[redacted connection URI]');
  console.error(`MongoDB connection failed: ${error.name}: ${message}`);
  const servers = error.reason?.servers;
  if (servers instanceof Map) for (const [host, description] of servers) {
    const cause = description.error;
    console.error(`  ${host}: ${cause ? `${cause.name} ${cause.code || ''} ${cause.message}` : description.type}`);
  }
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
}
