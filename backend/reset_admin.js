const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdmin() {
    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('admin', salt);

        await prisma.user.update({
            where: { email: 'admin@mms.com' },
            data: { passwordHash }
        });
        console.log('Password reset to "admin" for admin@mms.com');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

resetAdmin();
