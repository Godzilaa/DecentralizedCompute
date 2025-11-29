'use client';

import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: 'default' | 'destructive';
  isLoading?: boolean;
}

/**
 * Reusable confirmation dialog component
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'default',
  isLoading = false
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-medium text-zinc-200">{title}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="p-4">
          <p className="text-zinc-300">{message}</p>
        </div>
        
        <div className="flex gap-2 p-4 border-t border-zinc-800">
          <Button variant="ghost" onClick={onClose} disabled={isLoading} className="flex-1">
            Cancel
          </Button>
          <Button 
            variant={confirmVariant} 
            onClick={onConfirm} 
            disabled={isLoading}
            className="flex-1 gap-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            )}
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
}