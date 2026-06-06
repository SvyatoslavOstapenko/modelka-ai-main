'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { History } from 'lucide-react';

export interface ModelSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ModelSelectionDialog({
    open,
    onOpenChange,
}: ModelSelectionDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Выберите из Истории</DialogTitle>
                    <DialogDescription>
                        Ранее сгенерированные или загруженные модели.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-[300px] flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <History className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-muted-foreground text-center max-w-xs">
                        Здесь пока пусто. Сгенерируйте свою первую AI модель или загрузите фото.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
