import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";
import fs from "fs";

const runMigrate = async () => {
    // Пропустить миграции если установлена переменная SKIP_MIGRATIONS
    if (process.env.SKIP_MIGRATIONS === "true") {
        console.log("⏭️  Skipping migrations (SKIP_MIGRATIONS=true)");
        return;
    }

    const migrationFolder = path.resolve(process.cwd(), "drizzle");
    console.log(`📂 Migration folder: ${migrationFolder}`);

    // Проверка наличия папки и файлов (для отладки)
    if (fs.existsSync(migrationFolder)) {
        const files = fs.readdirSync(migrationFolder);
        console.log(`📄 Found ${files.length} files in migration folder:`, files);
        if (files.length === 0) {
            console.warn("⚠️  Warning: Migration folder is empty!");
        }
    } else {
        console.error(`❌ Migration folder not found at ${migrationFolder}`);
        // В Docker это может быть критично, но локально может быть просто ошибка пути
    }

    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error("❌ DATABASE_URL is not defined");
    }

    // Логика повторных попыток подключения (Retry Logic)
    let retries = 5;
    while (retries > 0) {
        try {
            console.log(`⏳ Connecting to database (Attempt ${6 - retries}/5)...`);

            // Создаем подключение.
            // max: 1 — чтобы скрипт не занимал лишние слоты.
            const sql = postgres(connectionString, { max: 1 });
            const db = drizzle(sql);

            console.log("🚀 Starting migration...");

            // Накатываем миграции из папки drizzle
            // Используем абсолютный путь для надежности
            await migrate(db, { migrationsFolder: migrationFolder });

            console.log("✅ Migrations completed successfully");
            await sql.end();
            return; // Успех
        } catch (err: unknown) {
            console.error("❌ Migration attempt failed:");
            console.error(err instanceof Error ? err.message : String(err));

            retries--;
            if (retries === 0) {
                console.error("❌ All migration attempts failed. Exiting.");
                process.exit(1);
            }

            console.log(`Waiting 5 seconds before retrying...`);
            await new Promise(res => setTimeout(res, 5000));
        }
    }
};

runMigrate();