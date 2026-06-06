'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { getUserCreditsAction } from '@/app/actions/credits';

// ============================================
// CONTEXT TYPES
// ============================================

interface CreditsContextType {
    credits: number;
    refreshCredits: () => Promise<void>;
    deductCredits: (amount: number) => void;
    refundCredits: (amount: number) => void;
}

// ============================================
// CONTEXT
// ============================================

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface CreditsProviderProps {
    children: ReactNode;
    initialCredits: number;
}

export function CreditsProvider({ children, initialCredits }: CreditsProviderProps) {
    const [credits, setCredits] = useState(initialCredits);

    // Refresh credits from server
    const refreshCredits = useCallback(async () => {
        const result = await getUserCreditsAction();
        if (result.success) {
            setCredits(result.credits);
        }
    }, []);

    // Optimistic update: deduct credits locally
    const deductCredits = useCallback((amount: number) => {
        setCredits(prev => Math.max(0, prev - amount));
    }, []);

    // Optimistic update: refund credits locally
    const refundCredits = useCallback((amount: number) => {
        setCredits(prev => prev + amount);
    }, []);

    return (
        <CreditsContext.Provider value={{ credits, refreshCredits, deductCredits, refundCredits }}>
            {children}
        </CreditsContext.Provider>
    );
}

// ============================================
// HOOK
// ============================================

export function useCredits(): CreditsContextType {
    const context = useContext(CreditsContext);
    if (context === undefined) {
        throw new Error('useCredits must be used within a CreditsProvider');
    }
    return context;
}
