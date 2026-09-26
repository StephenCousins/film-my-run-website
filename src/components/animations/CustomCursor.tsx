'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { runnerPose, type Limb } from './runnerPose';

// ============================================
// CUSTOM CURSOR COMPONENT
// ============================================
// A stylish custom cursor inspired by legendslounge.nl
// Features:
// - Smooth following animation
// - Expands on hover over interactive elements
// - Changes style based on element type
// - Hidden on mobile/touch devices

// The runner's joints in its 24x24 drawing, facing right.
const HIP = [11.8, 12.4], KNEE = [11.8, 16.8], FOOT = [11.8, 21.2];
const SHOULDER = [13.4, 7.0], ELBOW = [13.4, 10.0], HAND = [13.4, 12.8];

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

      stepRunner(performance.now());
      animationFrameId = requestAnimationFrame(animate);
    };

    // The runner: stride speed follows the mouse, eases to a stand when it stops,
    // and faces the way it is going. Joints are posed every frame from runnerPose.
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let speed = 0; // px per ms, smoothed
    let amount = 0; // 0 standing .. 1 flat out
    let phase = 0;
    let frameT = performance.now();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Looked up on the first frame the runner exists: it renders only after this effect finds a mouse.
    type Joints = Record<'fig' | 'nThigh' | 'nShin' | 'nArm' | 'nFore' | 'fThigh' | 'fShin' | 'fArm' | 'fFore', SVGGElement | null>;
    let joints: Joints | null = null;
    const getJoints = (): Joints | null => {
      if (joints || !runnerRef.current) return joints;
      const q = (k: string) => runnerRef.current!.querySelector<SVGGElement>(`[data-j="${k}"]`);
      joints = { fig: q('fig'), nThigh: q('n-thigh'), nShin: q('n-shin'), nArm: q('n-arm'), nFore: q('n-fore'), fThigh: q('f-thigh'), fShin: q('f-shin'), fArm: q('f-arm'), fFore: q('f-fore') };
      return joints;
    };
    const rot = (el: SVGGElement | null, deg: number, at: number[]) => el?.setAttribute('transform', `rotate(${deg.toFixed(1)} ${at[0]} ${at[1]})`);
    const poseLimb = (l: Limb, thigh: SVGGElement | null, shin: SVGGElement | null, arm: SVGGElement | null, fore: SVGGElement | null) => {
      rot(thigh, -l.thigh, HIP);
      rot(shin, l.knee, KNEE);
      rot(arm, -l.arm, SHOULDER);
      rot(fore, -l.elbow, ELBOW);
    };
    const stepRunner = (now: number) => {
      const dt = Math.min(50, now - frameT);
      frameT = now;
      speed *= Math.pow(0.9, dt / 16);
      // Full stride the moment the mouse moves (Stephen: "a much more pronounced running
      // action"); the mouse's speed sets the cadence, not the size of the stride.
      const target = reducedMotion ? 0 : speed > 0.04 ? 1 : 0;
      amount += (target - amount) * Math.min(1, dt / 70);
      if (amount > 0.02) phase += dt * (0.008 + 0.012 * Math.min(1, speed)); // 1.3-3 strides a second, as the first runner
      const j = getJoints();
      if (!j) return;
      const p = runnerPose(phase, amount);
      j.fig?.setAttribute('transform', `translate(0 ${p.bob.toFixed(2)})`);
      poseLimb(p.near, j.nThigh, j.nShin, j.nArm, j.nFore);
      poseLimb(p.far, j.fThigh, j.fShin, j.fArm, j.fFore);
    };

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      setState(prev => (prev.isVisible ? prev : { ...prev, isVisible: true }));

      const now = performance.now();
      const dx = e.clientX - lastX;
      const inst = Math.hypot(dx, e.clientY - lastY) / Math.max(1, now - lastT);
      speed = speed * 0.6 + Math.min(inst, 3) * 0.4;
      if (Math.abs(dx) > 1) runnerRef.current?.style.setProperty('--face', dx < 0 ? '-1' : '1');
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;
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

      {/* The runner at the centre (it was a dot) */}
      <div
        ref={cursorDotRef}
        className={cn(
          'fixed top-0 left-0 pointer-events-none z-[9999] -ml-[15px] -mt-[15px]',
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
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#f88c00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <g data-j="fig">
                {/* Far arm and leg first, fainter, so the near ones read in front */}
                <g opacity="0.5">
                  <g data-j="f-arm"><line x1={SHOULDER[0]} y1={SHOULDER[1]} x2={ELBOW[0]} y2={ELBOW[1]} /><g data-j="f-fore"><line x1={ELBOW[0]} y1={ELBOW[1]} x2={HAND[0]} y2={HAND[1]} /></g></g>
                  <g data-j="f-thigh"><line x1={HIP[0]} y1={HIP[1]} x2={KNEE[0]} y2={KNEE[1]} /><g data-j="f-shin"><polyline points={`${KNEE[0]},${KNEE[1]} ${FOOT[0]},${FOOT[1]} ${FOOT[0] + 1.3},${FOOT[1] + 0.2}`} /></g></g>
                </g>
                <circle cx="14.6" cy="3.8" r="2.1" fill="#f88c00" stroke="none" />
                <line x1={SHOULDER[0]} y1={SHOULDER[1]} x2={HIP[0]} y2={HIP[1]} strokeWidth="2.3" />
                <g data-j="n-thigh"><line x1={HIP[0]} y1={HIP[1]} x2={KNEE[0]} y2={KNEE[1]} /><g data-j="n-shin"><polyline points={`${KNEE[0]},${KNEE[1]} ${FOOT[0]},${FOOT[1]} ${FOOT[0] + 1.3},${FOOT[1] + 0.2}`} /></g></g>
                <g data-j="n-arm"><line x1={SHOULDER[0]} y1={SHOULDER[1]} x2={ELBOW[0]} y2={ELBOW[1]} /><g data-j="n-fore"><line x1={ELBOW[0]} y1={ELBOW[1]} x2={HAND[0]} y2={HAND[1]} /></g></g>
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
        .fmr-runner { --face: 1; transform: scaleX(var(--face)); transition: transform 0.15s; }
      `}</style>
    </>
  );
}
