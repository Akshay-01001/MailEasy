import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes.js';

const app = express();

const allowedOrigins = ['http://localhost:5173'];

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    }),
);

app.use(express.json());

app.get('/', (_, res) => {
    return res.json({ message: 'Server chal raha hain bhidu' });
});

app.use('/api/auth', authRouter);

export default app;

