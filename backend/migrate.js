const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function migrate() {
    console.log('Starting migration...');

    const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
    const originalSchema = fs.readFileSync(schemaPath, 'utf8');

    try {
        // 1. Setup Data Extraction from SQLite
        console.log('## Step 1: Connecting to SQLite...');
        const sqliteSchema = originalSchema.replace('provider = "postgresql"', 'provider = "sqlite"');
        fs.writeFileSync(schemaPath, sqliteSchema);
        console.log('Regenerating Prisma Client for SQLite...');
        execSync('npx prisma generate', { env: { ...process.env, DATABASE_URL: "file:./dev.db" }, stdio: 'pipe' });

        process.env.DATABASE_URL = "file:./dev.db";
        const sqlitePrisma = new PrismaClient({
            datasources: { db: { url: "file:./dev.db" } }
        });

        console.log('Fetching data from SQLite...');
        const users = await sqlitePrisma.user.findMany();
        const profiles = await sqlitePrisma.profile.findMany();
        const machines = await sqlitePrisma.machine.findMany();
        const breakdowns = await sqlitePrisma.breakdown.findMany();
        const maintenanceRecords = await sqlitePrisma.maintenanceRecord.findMany();
        const partReplacements = await sqlitePrisma.partReplacement.findMany();
        const taskLogNotes = await sqlitePrisma.taskLogNote.findMany();
        const notifications = await sqlitePrisma.notification.findMany();

        console.log(`Fetched: ${users.length} Users, ${profiles.length} Profiles, ${machines.length} Machines`);
        await sqlitePrisma.$disconnect();

        // 2. Setup Data Insertion into PostgreSQL
        console.log('\n## Step 2: Connecting to PostgreSQL...');
        fs.writeFileSync(schemaPath, originalSchema); // restore to postgresql
        console.log('Regenerating Prisma Client for PostgreSQL...');
        if (!process.env.RENDER_DB_URL) {
            throw new Error("RENDER_DB_URL environment variable is missing.");
        }
        execSync('npx prisma generate', { env: { ...process.env, DATABASE_URL: process.env.RENDER_DB_URL }, stdio: 'pipe' });

        process.env.DATABASE_URL = process.env.RENDER_DB_URL;
        const pgPrisma = new PrismaClient({
            datasources: { db: { url: process.env.RENDER_DB_URL } }
        });

        console.log('Connected to PostgreSQL. Starting insertion...');

        // Clear existing data in correct order to avoid foreign key constraints
        console.log('Clearing existing Postgres data...');
        await pgPrisma.notification.deleteMany();
        await pgPrisma.taskLogNote.deleteMany();
        await pgPrisma.partReplacement.deleteMany();
        await pgPrisma.maintenanceRecord.deleteMany();
        await pgPrisma.breakdown.deleteMany();
        await pgPrisma.profile.deleteMany();
        await pgPrisma.user.deleteMany();
        await pgPrisma.machine.deleteMany();

        // Insert data
        console.log('Inserting Users...');
        await pgPrisma.user.createMany({ data: users });

        console.log('Inserting Profiles...');
        await pgPrisma.profile.createMany({ data: profiles });

        console.log('Inserting Machines...');
        await pgPrisma.machine.createMany({ data: machines });

        console.log('Inserting Breakdowns...');
        await pgPrisma.breakdown.createMany({ data: breakdowns });

        console.log('Inserting Maintenance Records...');
        await pgPrisma.maintenanceRecord.createMany({ data: maintenanceRecords });

        console.log('Inserting Part Replacements...');
        await pgPrisma.partReplacement.createMany({ data: partReplacements });

        console.log('Inserting Task Log Notes...');
        await pgPrisma.taskLogNote.createMany({ data: taskLogNotes });

        console.log('Inserting Notifications...');
        await pgPrisma.notification.createMany({ data: notifications });

        console.log('\nMigration completed successfully!');
        await pgPrisma.$disconnect();
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        // Ensure schema is restored even if migration fails
        fs.writeFileSync(schemaPath, originalSchema);
        console.log('Restoring Original Prisma Schema and Client...');
        execSync('npx prisma generate', { env: { ...process.env, DATABASE_URL: process.env.RENDER_DB_URL }, stdio: 'pipe' });
    }
}

migrate();
