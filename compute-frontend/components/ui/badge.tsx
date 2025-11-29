import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'outline' | 'secondary';
    className?: string;
}

export const Badge = ({ children, variant = 'default', className }: BadgeProps) => {
    const variants = {
        default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        outline: 'bg-transparent border-zinc-700 text-zinc-400',
        secondary: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
    };

    return (
        <span className={cn("px-2 py-0.5 text-xs font-medium rounded-sm border", variants[variant], className)}>
            {children}
        </span>
    );
};
