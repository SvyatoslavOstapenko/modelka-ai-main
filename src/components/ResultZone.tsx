import { Sparkles } from "lucide-react";
import Image from "next/image";

interface ResultZoneProps {
    imageUrl?: string | null;
}

export function ResultZone({ imageUrl }: ResultZoneProps) {
    if (imageUrl) {
        return (
            <div className="h-full min-h-[500px] w-full bg-muted/30 rounded-xl border border-border overflow-hidden relative">
                <Image
                    src={imageUrl}
                    alt="Generated Result"
                    fill
                    className="object-contain"
                />
            </div>
        );
    }

    return (
        <div className="h-full min-h-[500px] w-full bg-muted/30 rounded-xl border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center text-center p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-background/0 via-background/0 to-muted/50 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10 flex flex-col items-center space-y-4">
                <div className="p-4 bg-background rounded-full shadow-sm border">
                    <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Здесь появится магия</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                    После загрузки фото и нажатия кнопки &quot;Сгенерировать&quot; результат появится здесь.
                </p>
            </div>
        </div>
    );
}
