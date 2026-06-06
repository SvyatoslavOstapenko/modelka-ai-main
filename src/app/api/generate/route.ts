import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

// Настраиваем авторизацию через переменную окружения
// FAL_KEY должен быть определен в .env.local
fal.config({
    credentials: process.env.FAL_KEY,
});

export async function POST(request: Request) {
    try {
        // 1. Получаем FormData из запроса
        const formData = await request.formData();
        const humanImageFile = formData.get("human_image") as File;
        const garmImageFile = formData.get("garm_image") as File;

        if (!humanImageFile || !garmImageFile) {
            return NextResponse.json(
                { error: "Both human_image and garm_image are required." },
                { status: 400 }
            );
        }

        console.log("Uploading images to Fal storage...");

        // 2. Загружаем файлы в хранилище Fal
        // fal.storage.upload принимает File объект напрямую
        const humanUrl = await fal.storage.upload(humanImageFile);
        const garmUrl = await fal.storage.upload(garmImageFile);

        console.log("Images uploaded:", { humanUrl, garmUrl });

        // 3. Формируем Input для модели
        // Модель требует image_urls: [human, garment] и prompt
        const input = {
            image_urls: [humanUrl, garmUrl],
            prompt: "Virtual try-on",
        };

        console.log("Submitting task to Fal AI...");

        // 4. Отправляем задачу и ждем результат (fal.subscribe)
        const result = await fal.subscribe("fal-ai/flux-2-lora-gallery/virtual-tryon", {
            input: input,
            logs: true, // Включаем логи для отладки в консоли сервера
            onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                    update.logs.map((log) => log.message).forEach(console.log);
                }
            },
        });

        console.log("Task completed. Result:", result);

        // 5. Возвращаем результат клиенту
        // fal.subscribe возвращает объект { data: ..., requestId: ... }
        // Нам нужно вернуть data, чтобы клиент получил { images: [...] }
        return NextResponse.json(result.data);

    } catch (error) {
        console.error("Error in generate route:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
