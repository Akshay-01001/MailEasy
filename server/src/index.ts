import 'dotenv/config';
import express from 'express';
import type { Response } from 'express';
import cors from 'cors';

const app = express();
app.use(
    cors({
        origin: ['http://localhost:5173'],
        credentials: true,
    }),
);

app.get('/', (_, res: Response) => {
    return res.json({ message: 'Server chal raha hain bhidu' });
});

app.listen(3000, () => {
    console.log(`http://localhost:${3000}`);
});
