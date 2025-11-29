import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    noPadding?: boolean;
}

export const Card = ({ children, className, noPadding = false }: CardProps) => (
    <div className={cn("bg-zinc-900/50 border border-zinc-800/60 rounded-lg backdrop-blur-sm overflow-hidden", className)}>
        <div className={cn(noPadding ? "" : "p-5")}>
            {children}
        </div>
    </div>
);
