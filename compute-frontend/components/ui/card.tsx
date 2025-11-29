import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    noPadding?: boolean;
}

export const Card = ({ children, className, noPadding = false, ...props }: CardProps) => (
    <div
        {...props}
        className={cn("bg-zinc-900/50 border border-zinc-800/60 rounded-lg backdrop-blur-sm overflow-hidden", className)}
    >
        <div className={cn(noPadding ? "" : "p-5")}>
            {children}
        </div>
    </div>
);
