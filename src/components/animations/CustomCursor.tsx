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
  // The runner in the middle of the ring: its class and facing change on every
  // mouse move, so they are set on the DOM directly rather than through state.
  const runnerRef = useRef<HTMLDivElement>(null);
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

    // The runner runs while the mouse moves, faces the way it is going, and
    // strides quicker the faster it goes; it stops a moment after the mouse does.
    let lastX = 0;
    let lastT = 0;
    let stopTimer: ReturnType<typeof setTimeout> | undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      setState(prev => (prev.isVisible ? prev : { ...prev, isVisible: true }));

      const runner = runnerRef.current;
      if (runner && !reducedMotion) {
        const now = performance.now();
        const dx = e.clientX - lastX;
        const speed = Math.abs(dx) / Math.max(1, now - lastT); // px per ms
        if (Math.abs(dx) > 1) runner.style.setProperty('--face', dx < 0 ? '-1' : '1');
        runner.style.setProperty('--stride', `${Math.max(0.16, Math.min(0.4, 0.4 - speed * 0.12)).toFixed(2)}s`);
        runner.classList.add('running');
        clearTimeout(stopTimer);
        stopTimer = setTimeout(() => runner.classList.remove('running'), 140);
        lastX = e.clientX;
        lastT = now;
      }
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
      clearTimeout(stopTimer);
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

      {/* The runner at the centre (it was a dot) */}
      <div
        ref={cursorDotRef}
        className={cn(
          'fixed top-0 left-0 pointer-events-none z-[9999] -ml-[13px] -mt-[13px]',
          'transition-opacity duration-300',
          state.isVisible ? 'opacity-100' : 'opacity-0'
        )}
        style={{ willChange: 'transform' }}
      >
        <div
          className={cn(
            'transition-transform duration-200',
            state.isHovering && state.hoverType !== 'text' ? 'scale-0' : 'scale-100'
          )}
        >
          <div ref={runnerRef} className="fmr-runner" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f88c00" strokeWidth="2.2" strokeLinecap="round">
              <g className="fmr-runner-body">
                <circle cx="13.5" cy="4" r="2.2" fill="#f88c00" stroke="none" />
                <line x1="12.6" y1="7.2" x2="11" y2="13" />
                <line className="fmr-arm-a" x1="12.3" y1="8.5" x2="15.5" y2="11.5" />
                <line className="fmr-arm-b" x1="12.3" y1="8.5" x2="9" y2="11" />
                <line className="fmr-leg-a" x1="11" y1="13" x2="13.5" y2="20.5" />
                <line className="fmr-leg-b" x1="11" y1="13" x2="8.5" y2="20.5" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Global style to hide default cursor */}
      <style jsx global>{`
        @media (pointer: fine) {
          * {
            cursor: none !important;
          }
        }
        .fmr-runner { --face: 1; --stride: 0.3s; transform: scaleX(var(--face)); transition: transform 0.15s; }
        .fmr-runner line { transform-box: view-box; }
        .fmr-arm-a, .fmr-arm-b { transform-origin: 12.3px 8.5px; }
        .fmr-leg-a, .fmr-leg-b { transform-origin: 11px 13px; }
        /* Standing: legs a little apart, arms loose */
        .fmr-leg-a { transform: rotate(-12deg); }
        .fmr-leg-b { transform: rotate(12deg); }
        .fmr-arm-a { transform: rotate(35deg); }
        .fmr-arm-b { transform: rotate(-25deg); }
        .fmr-runner.running .fmr-leg-a { animation: fmr-swing var(--stride) ease-in-out infinite alternate; }
        .fmr-runner.running .fmr-leg-b { animation: fmr-swing var(--stride) ease-in-out infinite alternate-reverse; }
        .fmr-runner.running .fmr-arm-a { animation: fmr-swing-arm var(--stride) ease-in-out infinite alternate-reverse; }
        .fmr-runner.running .fmr-arm-b { animation: fmr-swing-arm var(--stride) ease-in-out infinite alternate; }
        .fmr-runner.running .fmr-runner-body { animation: fmr-bob calc(var(--stride) / 2) ease-in-out infinite alternate; }
        @keyframes fmr-swing { from { transform: rotate(-40deg); } to { transform: rotate(40deg); } }
        @keyframes fmr-swing-arm { from { transform: rotate(-45deg); } to { transform: rotate(45deg); } }
        @keyframes fmr-bob { from { transform: translateY(0); } to { transform: translateY(-1px); } }
      `}</style>
    </>
  );
}
