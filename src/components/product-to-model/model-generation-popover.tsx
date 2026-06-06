'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, X, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ModelGenerationPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompt: string) => void;
    className?: string;
}

const SUGGESTIONS = [
    { label: 'Блондинка, светлые джинсы, белая студия', prompt: 'Блондинка модель, светло-голубые джинсы, белый минималистичный студийный фон' },
    { label: 'Мужчина, темная футболка, улица', prompt: 'Мужчина модель, темная футболка, улица' },
    { label: 'Брюнетка, темный фон, элегантный стиль', prompt: 'Брюнетка модель, темный фон, элегантный стиль' },
    { label: 'Рыжая девушка, бохо стиль, природа', prompt: 'Рыжая девушка модель, бохо стиль, природа' },
];

export function ModelGenerationPopover({
    isOpen,
    onClose,
    onGenerate,
    className
}: ModelGenerationPopoverProps) {
    const [prompt, setPrompt] = useState('');

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn("absolute bottom-full left-0 right-0 mb-2 z-40", className)}
        >
            <Card className="p-4 shadow-xl border-primary/20 bg-background/95 backdrop-blur-md">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-sm text-foreground">Опишите модель</h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Опишите внешность модели (например: одежда, поза, фон)..."
                    className="min-h-[80px] mb-3 text-sm resize-none bg-muted/50"
                />

                <Button
                    className="w-full gradient-primary text-white font-medium shadow-lg shadow-primary/20 mb-4"
                    onClick={() => onGenerate(prompt)}
                    disabled={!prompt.trim()}
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Сгенерировать
                </Button>

                <div className="relative flex items-center gap-2 mb-4">
                    <div className="h-px bg-border flex-1" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Или попробуйте варианты</span>
                    <div className="h-px bg-border flex-1" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {SUGGESTIONS.map((s, i) => (
                        <button
                            key={i}
                            className="text-left text-xs p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors border border-transparent hover:border-primary/30 truncate"
                            onClick={() => setPrompt(s.prompt)}
                            title={s.label}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="mt-3 pt-2 text-center border-t border-dashed border-border">
                    <button className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center w-full gap-1">
                        <User className="w-3 h-3" />
                        Больше опций в разделе Модели
                    </button>
                </div>
            </Card>
        </motion.div>
    );
}
