'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// CUSTOM CURSOR COMPONENT
// ============================================
// A stylish custom cursor inspired by legendslounge.nl
// Features:
// - Smooth following animation
// - Expands on hover over interactive elements
// - Changes style based on element type
// - Hidden on mobile/touch devices

interface CursorState {
  x: number;
  y: number;
  isHovering: boolean;
  hoverType: 'default' | 'link' | 'button' | 'image' | 'text';
  isVisible: boolean;
  isClicking: boolean;
}

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<CursorState>({
    x: 0,
    y: 0,
    isHovering: false,
    hoverType: 'default',
    isVisible: false,
    isClicking: false,
  });

  // Track if device supports hover (not touch)
  const [supportsHover, setSupportsHover] = useState(false);

  useEffect(() => {
    // Check if device has fine pointer (mouse)
    const hasPointer = window.matchMedia('(pointer: fine)').matches;
    setSupportsHover(hasPointer);

    if (!hasPointer) return;

    let animationFrameId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    // Smooth cursor animation
    const animate = () => {
      const ease = 0.15;
      currentX += (targetX - currentX) * ease;
      currentY += (targetY - currentY) * ease;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate(${targetX}px, ${targetY}px)`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      setState(prev => ({ ...prev, isVisible: true }));
    };

    // Mouse enter/leave window
    const handleMouseEnter = () => {
      setState(prev => ({ ...prev, isVisible: true }));
    };

    const handleMouseLeave = () => {
      setState(prev => ({ ...prev, isVisible: false }));
    };

    // Mouse down/up for click effect
    const handleMouseDown = () => {
      setState(prev => ({ ...prev, isClicking: true }));
    };

    const handleMouseUp = () => {
      setState(prev => ({ ...prev, isClicking: false }));
    };

    // Element hover detection
    const handleElementHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check for data-cursor attribute first
      const cursorType = target.closest('[data-cursor]')?.getAttribute('data-cursor');
      if (cursorType) {
        setState(prev => ({
          ...prev,
          isHovering: true,
          hoverType: cursorType as CursorState['hoverType'],
        }));
        return;
      }

      // Check element type
      const isLink = target.closest('a');
      const isButton = target.closest('button');
      const isImage = target.closest('img') || target.closest('[data-cursor="image"]');
      const isInput = target.closest('input, textarea');

      if (isLink) {
        setState(prev => ({ ...prev, isHovering: true, hoverType: 'link' }));
      } else if (isButton) {
        setState(prev => ({ ...prev, isHovering: true, hoverType: 'button' }));
      } else if (isImage) {
        setState(prev => ({ ...prev, isHovering: true, hoverType: 'image' }));
      } else if (isInput) {
        setState(prev => ({ ...prev, isHovering: true, hoverType: 'text' }));
      } else {
        setState(prev => ({ ...prev, isHovering: false, hoverType: 'default' }));
      }
    };

    // Start animation loop
    animate();

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousemove', handleElementHover);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleElementHover);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Don't render on touch devices
  if (!supportsHover) return null;

  return (
    <>
      {/* Main cursor ring */}
      <div
        ref={cursorRef}
        className={cn(
          'fixed top-0 left-0 pointer-events-none z-[9999] -ml-5 -mt-5',
          'transition-opacity duration-300',
          state.isVisible ? 'opacity-100' : 'opacity-0'
        )}
        style={{ willChange: 'transform' }}
      >
        <div
          className={cn(
            'w-10 h-10 rounded-full border-2 transition-all duration-300 ease-out',
            // Default state
            !state.isHovering && 'border-orange-500/50 scale-100',
            // Hovering states
            state.isHovering && state.hoverType === 'link' && 'border-orange-500 scale-150 bg-orange-500/10',
            state.isHovering && state.hoverType === 'button' && 'border-white scale-125 bg-white/10',
            state.isHovering && state.hoverType === 'image' && 'border-white scale-200 bg-white/5',
            state.isHovering && state.hoverType === 'text' && 'border-orange-500 scale-50',
            // Clicking
            state.isClicking && 'scale-90'
          )}
        />
      </div>

      {/* Center dot */}
      <div
        ref={cursorDotRef}
        className={cn(
          'fixed top-0 left-0 pointer-events-none z-[9999] -ml-1 -mt-1',
          'transition-opacity duration-300',
          state.isVisible ? 'opacity-100' : 'opacity-0'
        )}
        style={{ willChange: 'transform' }}
      >
        <div
          className={cn(
            'w-2 h-2 rounded-full transition-all duration-200',
            // Default
            !state.isHovering && 'bg-orange-500',
            // Hovering
            state.isHovering && 'bg-orange-500 scale-0',
            // Text input - show as line
            state.isHovering && state.hoverType === 'text' && 'bg-orange-500 scale-100'
          )}
        />
      </div>

      {/* Global style to hide default cursor */}
      <style jsx global>{`
        @media (pointer: fine) {
          * {
            cursor: none !important;
          }
        }
      `}</style>
    </>
  );
}
