import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get users (All authenticated users can view, admins can manage)
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { role } = req.query;

        const filter: any = {};
        if (role && typeof role === 'string') {
            filter.role = role.toLowerCase();
        }

        const users = await prisma.user.findMany({
            where: filter,
            include: {
                profile: true
            }
        });

        // Map to DbProfile format expected by frontend
        const formattedUsers = users.map(u => ({
            id: u.profile?.id || u.id,
            user_id: u.id,
            name: u.profile?.name || u.email.split('@')[0],
            email: u.email,
            department: u.profile?.department || null,
            avatar_url: u.profile?.avatarUrl || null,
            role: u.role,
            created_at: u.createdAt,
            updated_at: u.updatedAt
        }));

        res.json(formattedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

// Get user by ID (All authenticated can view, but maybe restrict detailed view in future. Leaving as authenticate for now)
router.get('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = String(req.params.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.profile?.id || user.id,
            user_id: user.id,
            name: user.profile?.name || user.email.split('@')[0],
            email: user.email,
            department: user.profile?.department || null,
            avatar_url: user.profile?.avatarUrl || null,
            role: user.role,
            created_at: user.createdAt,
            updated_at: user.updatedAt
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Error fetching user' });
    }
});

// Create a new user (Admin only)
router.post('/', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
        const { employeeId, name, email, department, role, password } = req.body;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'User with this email already exists' });
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
                        department: department || null
                    }
                }
            },
            include: { profile: true }
        });

        res.status(201).json({
            id: user.profile?.id || user.id,
            user_id: user.id,
            name: user.profile?.name,
            email: user.email,
            department: user.profile?.department,
            role: user.role,
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
});

// Update a user's role, profile details, or credentials
// Users can update their own profile, but Admin can update roles and other users.
// For simplicity we will handle the logic inside the route, since anyone can theoretically call it for their own profile.
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = String(req.params.id);
        const authUser = (req as any).user;
        const { role, name, department, email, password } = req.body;

        // If not admin, restrict what they can do
        if (authUser.role !== 'admin') {
            if (userId !== authUser.id) {
                return res.status(403).json({ error: 'Forbidden: You can only update your own profile' });
            }
            if (role) {
                return res.status(403).json({ error: 'Forbidden: You cannot change your own role' });
            }
        }

        // Perform updates in a transaction since it touches two tables
        const updatedUser = await prisma.$transaction(async (tx) => {
            let user = await tx.user.findUnique({ where: { id: userId }, include: { profile: true } });
            if (!user) throw new Error('User not found');

            // Admin only fields (role, email)
            const updateData: any = {};
            if (role) {
                updateData.role = String(role).toLowerCase();
            }
            if (email) {
                // Should technically check if email exists already, but let Prisma throw for constraint
                updateData.email = String(email);
            }
            if (password) {
                const salt = await bcrypt.genSalt(10);
                updateData.passwordHash = await bcrypt.hash(String(password), salt);
            }

            if (Object.keys(updateData).length > 0) {
                user = await tx.user.update({
                    where: { id: userId },
                    data: updateData,
                    include: { profile: true }
                });
            }

            if (name !== undefined || department !== undefined) {
                if (user.profile) {
                    await tx.profile.update({
                        where: { id: user.profile.id },
                        data: {
                            name: name !== undefined ? String(name) : user.profile.name,
                            department: department !== undefined ? String(department) : user.profile.department
                        }
                    });
                }
            }

            return tx.user.findUnique({ where: { id: userId }, include: { profile: true } });
        });

        res.json({
            id: updatedUser?.profile?.id || updatedUser?.id,
            user_id: updatedUser?.id,
            name: updatedUser?.profile?.name,
            email: updatedUser?.email,
            department: updatedUser?.profile?.department,
            role: updatedUser?.role,
        });
    } catch (error: any) {
        console.error('Error updating user:', error);
        res.status(error.message === 'User not found' ? 404 : 500).json({ error: error.message || 'Error updating user' });
    }
});

// Delete a user (Admin only)
router.delete('/:id', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
        await prisma.user.delete({
            where: { id: String(req.params.id) }
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Error deleting user' });
    }
});

export default router;
