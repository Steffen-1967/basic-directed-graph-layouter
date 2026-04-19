'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, AlertOctagon, Info } from 'lucide-react';

export interface Toast {
    id: string;
    message: string;
    type: 'info' | 'warning' | 'error';
}

/**
 * Global toast emitter helper to allow non-react code to show toasts.
 */
let toastEmitter: (message: string, type?: 'info' | 'warning' | 'error') => void = () => {};

export const showToast = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    toastEmitter(message, type);
};

export default function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: 'info' | 'warning' | 'error' = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        
        // Avoid duplicate toasts within a short window (similar to old logic)
        setToasts(prev => {
            const isDuplicate = prev.some(t => t.message === message);
            if (isDuplicate) return prev;
            return [...prev, { id, message, type }];
        });

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    useEffect(() => {
        toastEmitter = addToast;
    }, [addToast]);

    return (
        <div id="toastContainer" className="toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast toast-${toast.type}`}>
                    {toast.type === 'error' ? <AlertOctagon size={18} /> : (toast.type === 'warning' ? <AlertCircle size={18} /> : <Info size={18} />)}
                    <span>{toast.message}</span>
                </div>
            ))}
        </div>
    );
}
