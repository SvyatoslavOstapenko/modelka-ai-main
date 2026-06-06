"use client";

import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import { X } from "lucide-react";
import Image from "next/image";

interface UploadZoneProps {
    title: string;
    description?: string;
    icon: React.ReactNode;
    className?: string;
    onFileSelect: (file: File | null) => void;
    selectedFile: File | null;
}

export function UploadZone({ title, description, icon, className, onFileSelect, selectedFile }: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onFileSelect(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const previewUrl = selectedFile ? URL.createObjectURL(selectedFile) : null;

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-colors duration-200 ease-in-out cursor-pointer hover:bg-muted/50 overflow-hidden",
                isDragging ? "border-primary bg-muted/50" : "border-muted-foreground/25",
                className
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            {previewUrl ? (
                <div className="relative w-full h-full">
                    <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-contain p-2"
                    />
                    <button
                        onClick={handleRemove}
                        className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    <div className="p-4 bg-background rounded-full shadow-sm mb-4 border">
                        {icon}
                    </div>
                    <p className="mb-2 text-sm font-medium text-foreground">
                        {title}
                    </p>
                    {description && (
                        <p className="text-xs text-muted-foreground">
                            {description}
                        </p>
                    )}
                    <div className="mt-4">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                            Drag & Drop или кликните
                        </span>
                    </div>
                </div>
            )}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
            />
        </div>
    );
}
