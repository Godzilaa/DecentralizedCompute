import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
    size?: 'sm' | 'default' | 'lg';
    className?: string;
    onClick?: () => void;
}

export const Button = ({
    children,
    variant = 'primary',
    size = 'default',
    className,
    onClick
}: ButtonProps) => {
    const base = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
        primary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
        secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
        ghost: "hover:bg-zinc-800 text-zinc-300 hover:text-white",
        outline: "border border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-100"
    };

    const sizes = {
        sm: "h-8 px-3 text-xs",
        default: "h-10 py-2 px-4 text-sm",
        lg: "h-12 px-8 text-base"
    };

    return (
        <button
            className={cn(base, variants[variant], sizes[size], "rounded-md", className)}
            onClick={onClick}
        >
            {children}
        </button>
    );
};
