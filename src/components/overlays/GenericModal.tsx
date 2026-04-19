'use client';

import React from 'react';
import { X, AlertTriangle, Info, ShieldAlert, Check } from 'lucide-react'; // Added Check icon

interface GenericModalProps {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'error';
    buttons: {
        label: string;
        onClick: () => void;
        className?: string; // Keep className for potential overrides, though now managed internally for standard buttons
    }[];
    onClose?: () => void;
}

export default function GenericModal({ 
    title, 
    message, 
    type = 'info', 
    buttons, 
    onClose 
}: GenericModalProps) {
    const getIcon = () => {
        switch (type) {
            case 'error': return <ShieldAlert size={24} className="modal-icon-error" />;
            case 'warning': return <AlertTriangle size={24} className="modal-icon-warning" />;
            default: return <Info size={24} className="modal-icon-info" />;
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    {getIcon()}
                    <h3>{title}</h3>
                    {/* Removed close button from header to ensure closure only via footer buttons */}
                </div>
                <div className="modal-body">
                    <p>{message}</p>
                </div>
                <div className="modal-buttons">
                    {buttons.map((btn, index) => {
                        let buttonLabel = btn.label;
                        let buttonClassName = btn.className || 'btn-secondary'; // Default to secondary
                        let buttonIcon = null;

                        // Standardize OK and Cancel/Abbrechen buttons
                        if (btn.label.toLowerCase() === 'ok') {
                            buttonClassName = 'btn-primary'; // OK gets primary styling
                            buttonIcon = <Check size={16} />;
                        } else if (btn.label.toLowerCase() === 'abbrechen' || btn.label.toLowerCase() === 'cancel') {
                            buttonClassName = 'btn-secondary'; // Cancel/Abbrechen gets secondary styling
                            buttonIcon = <X size={16} />;
                        }

                        return (
                            <button 
                                key={index} 
                                className={buttonClassName} 
                                onClick={btn.onClick}
                            >
                                {buttonIcon} {buttonLabel}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
