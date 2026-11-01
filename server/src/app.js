import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import api from './routes/index.js';
import documentRoutes from './routes/documentRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';

const app = express();
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use('/api', api);
app.use('/api', documentRoutes);
app.use('/api', workflowRoutes);
app.use((_req, _res, next) => { const error = new Error('Route not found'); error.status = 404; next(error); });
app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ message: status >= 500 ? 'Internal server error' : error.message });
});
export default app;
