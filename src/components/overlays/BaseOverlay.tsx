'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface BaseOverlayProps {
    title: string;
    children: React.ReactNode;
    initialPosition?: { x: number, y: number } | null;
    onClose: () => void;
    width?: string | number;
    height?: string | number;
    className?: string;
}

/**
 * BaseOverlay provides a draggable container with standardized styling.
 */
export default function BaseOverlay({ 
    title, 
    children, 
    initialPosition, 
    onClose, 
    width = 600, 
    height = 'auto',
    className = ''
}: BaseOverlayProps) {
    const [pos, setPosition] = useState({ x: 100, y: 100 });
    const overlayRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });

    // Initialize position and clamp to viewport
    useEffect(() => {
        if (initialPosition) {
            let targetX = initialPosition.x;
            let targetY = initialPosition.y;

            // Simple viewport clamping
            const w = typeof width === 'number' ? width : 600;
            const h = 400; // Estimated max height for clamping

            if (targetX + w > window.innerWidth) targetX = window.innerWidth - w - 20;
            if (targetY + h > window.innerHeight) targetY = window.innerHeight - h - 20;

            targetX = Math.max(10, targetX);
            targetY = Math.max(10, targetY);

            setPosition({ x: targetX, y: targetY });
        }
    }, [initialPosition, width]);

    const handleMouseDown = (e: React.MouseEvent) => {
        const targetElement = e.target as HTMLElement;
        const handleElement = targetElement.closest('.overlay-handle');

        if (handleElement && !targetElement.closest('button')) {
            isDragging.current = true;
            dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
            
            const onMouseMove = (me: MouseEvent) => {
                if (isDragging.current) {
                    const newX = me.clientX - dragStart.current.x;
                    const newY = me.clientY - dragStart.current.y;
                    
                    // Viewport clamping during drag
                    const clampedX = Math.max(0, Math.min(newX, window.innerWidth - (overlayRef.current?.offsetWidth || 0)));
                    const clampedY = Math.max(0, Math.min(newY, window.innerHeight - (overlayRef.current?.offsetHeight || 0)));
                    
                    setPosition({ x: clampedX, y: clampedY });
                }
            };
            
            const onMouseUp = () => {
                isDragging.current = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
            e.stopPropagation();
        }
    };

    return (
        <div 
            ref={overlayRef}
            className={`react-overlay-container ${className}`}
            style={{
                position: 'fixed',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: width,
                height: height,
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 9500,
                boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                backgroundColor: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                pointerEvents: 'auto'
            }}
            onMouseDown={handleMouseDown}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="overlay-handle" style={{ cursor: 'move', userSelect: 'none' }}>
                <span style={{ pointerEvents: 'none' }}>{title}</span>
                <button className="overlay-close-btn" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                    <X size={16} />
                </button>
            </div>
            <div className="overlay-content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {children}
            </div>
        </div>
    );
}
