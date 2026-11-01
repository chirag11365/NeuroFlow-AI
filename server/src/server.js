import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { seedDemoData } from './services/seed.js';
import { getMongoConnectionUri } from './services/mongoConnection.js';

if (env.mongoUri) {
  try {
    const connectionUri = await getMongoConnectionUri();
    await mongoose.connect(connectionUri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 8000 });
    console.log(`MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`);
  }
  catch (error) { console.warn(`MongoDB unavailable; using memory repository (${error.message})`); }
} else console.log('MONGODB_URI not set; using memory repository');

try { await seedDemoData(env.seedSampleData); }
catch (error) { console.warn(`Demo data could not be seeded: ${error.message}`); }

app.listen(env.port, () => console.log(`NeuroFlow API listening on http://localhost:${env.port}`));
