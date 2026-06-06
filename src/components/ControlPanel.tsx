"use client";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Wand2 } from "lucide-react";

export interface ControlPanelProps {
    onGenerate: () => void;
    isGenerating: boolean;
}

export function ControlPanel({ onGenerate, isGenerating }: ControlPanelProps) {
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-background border rounded-xl shadow-sm mt-8">
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <span className="text-sm font-medium whitespace-nowrap">Размер:</span>
                <Select defaultValue="wb">
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Выберите размер" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="wb">900x1200 (WB)</SelectItem>
                        <SelectItem value="ozon">1200x1600 (Ozon)</SelectItem>
                        <SelectItem value="square">1024x1024 (Square)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button
                size="lg"
                className="w-full sm:w-auto min-w-[200px] text-lg h-12 gap-2 shadow-lg hover:shadow-xl transition-all"
                onClick={onGenerate}
                disabled={isGenerating}
            >
                <Wand2 className={`w-5 h-5 ${isGenerating ? "animate-spin" : ""}`} />
                {isGenerating ? "Генерация..." : "Сгенерировать"}
            </Button>
        </div>
    );
}
