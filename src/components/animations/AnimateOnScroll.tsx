'use client';

import { useEffect, useRef, ReactNode, ElementType } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@/lib/utils';

// Register GSAP plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export type AnimationVariant =
  | 'fadeIn'
  | 'fadeInUp'
  | 'fadeInDown'
  | 'fadeInLeft'
  | 'fadeInRight'
  | 'scaleIn'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'reveal';

interface AnimateOnScrollProps {
  children: ReactNode;
  variant?: AnimationVariant;
  duration?: number;
  delay?: number;
  distance?: number;
  scale?: number;
  start?: string;
  once?: boolean;
  className?: string;
  as?: ElementType;
}

const variants: Record<AnimationVariant, { from: gsap.TweenVars; to: gsap.TweenVars }> = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  fadeInUp: {
    from: { opacity: 0, y: 50 },
    to: { opacity: 1, y: 0 },
  },
  fadeInDown: {
    from: { opacity: 0, y: -50 },
    to: { opacity: 1, y: 0 },
  },
  fadeInLeft: {
    from: { opacity: 0, x: -50 },
    to: { opacity: 1, x: 0 },
  },
  fadeInRight: {
    from: { opacity: 0, x: 50 },
    to: { opacity: 1, x: 0 },
  },
  scaleIn: {
    from: { opacity: 0, scale: 0.9 },
    to: { opacity: 1, scale: 1 },
  },
  slideUp: {
    from: { y: 100 },
    to: { y: 0 },
  },
  slideDown: {
    from: { y: -100 },
    to: { y: 0 },
  },
  slideLeft: {
    from: { x: 100 },
    to: { x: 0 },
  },
  slideRight: {
    from: { x: -100 },
    to: { x: 0 },
  },
  reveal: {
    from: { clipPath: 'inset(100% 0 0 0)', opacity: 0 },
    to: { clipPath: 'inset(0% 0 0 0)', opacity: 1 },
  },
};

export default function AnimateOnScroll({
  children,
  variant = 'fadeInUp',
  duration = 1,
  delay = 0,
  distance,
  scale,
  start = 'top 85%',
  once = true,
  className,
  as: Component = 'div',
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Get variant configuration
    const variantConfig = variants[variant];
    let fromState = { ...variantConfig.from };
    const toState = { ...variantConfig.to };

    // Apply custom distance if provided
    if (distance !== undefined) {
      if ('y' in fromState) fromState.y = Math.sign(fromState.y as number) * distance;
      if ('x' in fromState) fromState.x = Math.sign(fromState.x as number) * distance;
    }

    // Apply custom scale if provided
    if (scale !== undefined && 'scale' in fromState) {
      fromState.scale = scale;
    }

    // Set initial state
    gsap.set(element, fromState);

    // Create animation
    const animation = gsap.to(element, {
      ...toState,
      duration,
      delay,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: element,
        start,
        toggleActions: once ? 'play none none none' : 'play reverse play reverse',
      },
    });

    return () => {
      animation.kill();
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.trigger === element) {
          trigger.kill();
        }
      });
    };
  }, [variant, duration, delay, distance, scale, start, once]);

  return (
    <Component ref={ref as any} className={cn('will-change-transform', className)}>
      {children}
    </Component>
  );
}

// Stagger children animation
interface StaggerContainerProps {
  children: ReactNode;
  stagger?: number;
  duration?: number;
  delay?: number;
  variant?: AnimationVariant;
  start?: string;
  once?: boolean;
  className?: string;
  childSelector?: string;
}

export function StaggerContainer({
  children,
  stagger = 0.1,
  duration = 0.8,
  delay = 0,
  variant = 'fadeInUp',
  start = 'top 85%',
  once = true,
  className,
  childSelector = '.stagger-item',
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const items = container.querySelectorAll(childSelector);
    if (items.length === 0) return;

    const variantConfig = variants[variant];

    // Set initial state
    gsap.set(items, variantConfig.from);

    // Create stagger animation
    const animation = gsap.to(items, {
      ...variantConfig.to,
      duration,
      delay,
      stagger,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: container,
        start,
        toggleActions: once ? 'play none none none' : 'play reverse play reverse',
      },
    });

    return () => {
      animation.kill();
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.trigger === container) {
          trigger.kill();
        }
      });
    };
  }, [stagger, duration, delay, variant, start, once, childSelector]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// Parallax wrapper
interface ParallaxProps {
  children: ReactNode;
  speed?: number;
  className?: string;
}

export function Parallax({ children, speed = 0.3, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const animation = gsap.to(element, {
      y: () => `${speed * 100}%`,
      ease: 'none',
      scrollTrigger: {
        trigger: element,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    return () => {
      animation.kill();
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.trigger === element) {
          trigger.kill();
        }
      });
    };
  }, [speed]);

  return (
    <div ref={ref} className={cn('will-change-transform', className)}>
      {children}
    </div>
  );
}

// Horizontal scroll section
interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
}

export function HorizontalScroll({ children, className }: HorizontalScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const scroll = scrollRef.current;
    if (!container || !scroll) return;

    const scrollWidth = scroll.scrollWidth - container.offsetWidth;

    const animation = gsap.to(scroll, {
      x: -scrollWidth,
      ease: 'none',
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: () => `+=${scrollWidth}`,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
      },
    });

    return () => {
      animation.kill();
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.trigger === container) {
          trigger.kill();
        }
      });
    };
  }, []);

  return (
    <div ref={containerRef} className={cn('overflow-hidden', className)}>
      <div ref={scrollRef} className="flex">
        {children}
      </div>
    </div>
  );
}

// Text reveal animation
interface TextRevealProps {
  children: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  splitBy?: 'words' | 'chars' | 'lines';
  stagger?: number;
  duration?: number;
  delay?: number;
}

export function TextReveal({
  children,
  className,
  as: Component = 'p',
  splitBy = 'words',
  stagger = 0.05,
  duration = 0.8,
  delay = 0,
}: TextRevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Split text
    const text = children;
    let parts: string[];

    switch (splitBy) {
      case 'chars':
        parts = text.split('');
        break;
      case 'lines':
        parts = text.split('\n');
        break;
      case 'words':
      default:
        parts = text.split(' ');
    }

    // Create spans
    element.innerHTML = parts
      .map(
        (part, i) =>
          `<span class="inline-block overflow-hidden"><span class="reveal-part inline-block">${part}${splitBy === 'words' ? '&nbsp;' : ''}</span></span>`
      )
      .join('');

    const partElements = element.querySelectorAll('.reveal-part');

    // Set initial state
    gsap.set(partElements, {
      y: '100%',
      opacity: 0,
    });

    // Animate
    const animation = gsap.to(partElements, {
      y: '0%',
      opacity: 1,
      duration,
      delay,
      stagger,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: element,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });

    return () => {
      animation.kill();
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.trigger === element) {
          trigger.kill();
        }
      });
    };
  }, [children, splitBy, stagger, duration, delay]);

  return <Component ref={ref as any} className={className} />;
}
