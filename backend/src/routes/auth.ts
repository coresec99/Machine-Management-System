import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const userRole = user.role ? user.role.toLowerCase() : 'operator';

        const token = jwt.sign(
            { id: user.id, email: user.email, role: userRole },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({ token, user: { id: user.id, email: user.email, role: userRole, name: user.profile?.name } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Admin only: create a new user
// Realistically, you'd add authenticate and requireRole(['ADMIN']) here
router.post('/register', async (req: Request, res: Response) => {
    const { email, password, name, role, department } = req.body;

    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role: role ? role.toLowerCase() : 'operator',
                profile: {
                    create: {
                        name,
                        department
                    }
                }
            },
            include: { profile: true }
        });

        res.status(201).json({ message: 'User created successfully', user: { id: user.id, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: 'Server error during registration' });
    }
});

export default router;
