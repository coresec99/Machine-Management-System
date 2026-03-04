const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function reset() {
    process.env.DATABASE_URL = process.env.RENDER_DB_URL;
    const pgPrisma = new PrismaClient({
        datasources: { db: { url: process.env.RENDER_DB_URL } }
    });

    console.log('Resetting passwords...');
    const hash = await bcrypt.hash('password', 10);
    await pgPrisma.user.updateMany({
        data: { passwordHash: hash }
    });

    console.log('Passwords reset successfully. You can now login with "password"');
    await pgPrisma.$disconnect();
}

reset();
