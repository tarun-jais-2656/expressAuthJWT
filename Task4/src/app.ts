import express from 'express';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { jsonVerify, rejectDangerousPayload } from './middlewares/rejectDangerousPayload.js';
import routes from './routes/index.js';

const app = express();

app.use(express.json({ limit: '1mb', verify: jsonVerify }));
app.use(rejectDangerousPayload);
app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
