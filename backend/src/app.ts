import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));
app.use(express.json());
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

export default app;