"use client";

import { useState } from "react";
import { Hero } from "@/components/Hero";
import { UploadZone } from "@/components/UploadZone";
import { ResultZone } from "@/components/ResultZone";
import { ControlPanel } from "@/components/ControlPanel";
import { User, Shirt } from "lucide-react";

export function TryOnApp() {
    const [humanImage, setHumanImage] = useState<File | null>(null);
    const [garmImage, setGarmImage] = useState<File | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!humanImage || !garmImage) {
            alert("Пожалуйста, загрузите оба изображения.");
            return;
        }

        setIsGenerating(true);
        setResultImage(null);

        try {
            const formData = new FormData();
            formData.append("human_image", humanImage);
            formData.append("garm_image", garmImage);

            const response = await fetch("/api/generate", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate");
            }

            // Fal AI usually returns { images: [{ url: "..." }] }
            if (data.images && data.images.length > 0) {
                setResultImage(data.images[0].url);
            } else {
                console.error("No image in response:", data);
                alert("Ошибка: сервер не вернул изображение.");
            }

        } catch (error) {
            console.error("Generation error:", error);
            alert("Произошла ошибка при генерации. Проверьте консоль.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <main className="flex-1 container mx-auto px-4 pb-12">
            <Hero />

            <div className="max-w-6xl mx-auto space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Upload Zones */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold tracking-tight">1. Загрузите модель</h2>
                            <UploadZone
                                title="Фото человека/модели"
                                description="Загрузите фото, на которое нужно надеть одежду"
                                icon={<User className="w-8 h-8 text-muted-foreground" />}
                                onFileSelect={setHumanImage}
                                selectedFile={humanImage}
                            />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold tracking-tight">2. Загрузите одежду</h2>
                            <UploadZone
                                title="Фото одежды"
                                description="На вешалке или раскладка (flat lay)"
                                icon={<Shirt className="w-8 h-8 text-muted-foreground" />}
                                onFileSelect={setGarmImage}
                                selectedFile={garmImage}
                            />
                        </div>
                    </div>

                    {/* Right Column: Result Zone */}
                    <div className="lg:col-span-7 space-y-2 flex flex-col">
                        <h2 className="text-lg font-semibold tracking-tight">3. Результат</h2>
                        <ResultZone imageUrl={resultImage} />
                    </div>
                </div>

                <ControlPanel
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                />
            </div>
        </main>
    );
}
