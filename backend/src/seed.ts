import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@mms.com' } });

    if (!existingAdmin) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('admin123', salt);

        await prisma.user.create({
            data: {
                email: 'admin@mms.com',
                passwordHash,
                role: 'admin',
                profile: {
                    create: {
                        name: 'System Administrator',
                        department: 'Management'
                    }
                }
            }
        });
        console.log('Seed: Created admin@mms.com / admin123');
    } else {
        console.log('Seed: Admin user already exists');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
