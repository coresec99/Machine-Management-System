import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth';
import machineRoutes from './routes/machines';
import breakdownRoutes from './routes/breakdowns';
import userRoutes from './routes/users';
import { initCronJobs } from './services/cronService';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// Enable CORS for all origins and common headers (useful for Postman and Frontend)
// app.use(cors({
//     origin: '*',
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
// }));
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/breakdowns', breakdownRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'MMS Custom Backend API is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Start Cron Jobs
    initCronJobs();
});
