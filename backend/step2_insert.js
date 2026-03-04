const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function insertPostgres() {
    if (!process.env.RENDER_DB_URL) {
        console.error("ERROR: RENDER_DB_URL is required");
        process.exit(1);
    }

    process.env.DATABASE_URL = process.env.RENDER_DB_URL;
    const pgPrisma = new PrismaClient({
        datasources: { db: { url: process.env.RENDER_DB_URL } }
    });

    console.log('Connected to PostgreSQL. Reading migration_data.json...');
    const data = JSON.parse(fs.readFileSync('migration_data.json', 'utf8'));

    try {
        console.log('Clearing existing Postgres data...');
        await pgPrisma.notification.deleteMany();
        await pgPrisma.taskLogNote.deleteMany();
        await pgPrisma.partReplacement.deleteMany();
        await pgPrisma.maintenanceRecord.deleteMany();
        await pgPrisma.breakdown.deleteMany();
        await pgPrisma.profile.deleteMany();
        await pgPrisma.user.deleteMany();
        await pgPrisma.machine.deleteMany();

        console.log('Inserting Users...');
        await pgPrisma.user.createMany({ data: data.users });

        console.log('Inserting Profiles...');
        await pgPrisma.profile.createMany({ data: data.profiles });

        console.log('Inserting Machines...');
        await pgPrisma.machine.createMany({ data: data.machines });

        console.log('Inserting Breakdowns...');
        await pgPrisma.breakdown.createMany({ data: data.breakdowns });

        console.log('Inserting Maintenance Records...');
        await pgPrisma.maintenanceRecord.createMany({ data: data.maintenanceRecords });

        console.log('Inserting Part Replacements...');
        await pgPrisma.partReplacement.createMany({ data: data.partReplacements });

        console.log('Inserting Task Log Notes...');
        await pgPrisma.taskLogNote.createMany({ data: data.taskLogNotes });

        console.log('Inserting Notifications...');
        await pgPrisma.notification.createMany({ data: data.notifications });

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pgPrisma.$disconnect();
    }
}

insertPostgres();
