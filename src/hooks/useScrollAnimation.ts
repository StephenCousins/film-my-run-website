'use client';

import { useEffect, useRef, RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export type AnimationType =
  | 'fadeIn'
  | 'fadeInUp'
  | 'fadeInDown'
  | 'fadeInLeft'
  | 'fadeInRight'
  | 'scaleIn'
  | 'slideUp'
  | 'parallax'
  | 'stagger';

interface ScrollAnimationOptions {
  type?: AnimationType;
  duration?: number;
  delay?: number;
  stagger?: number;
  start?: string;
  end?: string;
  scrub?: boolean | number;
  markers?: boolean;
  once?: boolean;
  ease?: string;
  distance?: number;
  scale?: number;
}

const defaultOptions: ScrollAnimationOptions = {
  type: 'fadeInUp',
  duration: 1,
  delay: 0,
  stagger: 0.1,
  start: 'top 85%',
  end: 'bottom 15%',
  scrub: false,
  markers: false,
  once: true,
  ease: 'power3.out',
  distance: 50,
  scale: 0.95,
};

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: ScrollAnimationOptions = {}
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const opts = { ...defaultOptions, ...options };

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Get initial state based on animation type
    const getFromState = () => {
      switch (opts.type) {
        case 'fadeIn':
          return { opacity: 0 };
        case 'fadeInUp':
          return { opacity: 0, y: opts.distance };
        case 'fadeInDown':
          return { opacity: 0, y: -opts.distance! };
        case 'fadeInLeft':
          return { opacity: 0, x: -opts.distance! };
        case 'fadeInRight':
          return { opacity: 0, x: opts.distance };
        case 'scaleIn':
          return { opacity: 0, scale: opts.scale };
        case 'slideUp':
          return { y: opts.distance };
        default:
          return { opacity: 0, y: opts.distance };
      }
    };

    const getToState = () => {
      switch (opts.type) {
        case 'fadeIn':
          return { opacity: 1 };
        case 'fadeInUp':
        case 'fadeInDown':
          return { opacity: 1, y: 0 };
        case 'fadeInLeft':
        case 'fadeInRight':
          return { opacity: 1, x: 0 };
        case 'scaleIn':
          return { opacity: 1, scale: 1 };
        case 'slideUp':
          return { y: 0 };
        default:
          return { opacity: 1, y: 0 };
      }
    };

    // Set initial state
    gsap.set(element, getFromState());

    // Create animation
    const animation = gsap.to(element, {
      ...getToState(),
      duration: opts.duration,
      delay: opts.delay,
      ease: opts.ease,
      scrollTrigger: {
        trigger: element,
        start: opts.start,
        end: opts.end,
        scrub: opts.scrub,
        markers: opts.markers,
        toggleActions: opts.once ? 'play none none none' : 'play reverse play reverse',
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
  }, [opts]);

  return ref;
}

// Stagger animation for multiple children
export function useStaggerAnimation<T extends HTMLElement = HTMLDivElement>(
  selector: string = '.animate-item',
  options: ScrollAnimationOptions = {}
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const opts = { ...defaultOptions, ...options };

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const items = container.querySelectorAll(selector);
    if (items.length === 0) return;

    // Set initial state
    gsap.set(items, { opacity: 0, y: opts.distance });

    // Create stagger animation
    const animation = gsap.to(items, {
      opacity: 1,
      y: 0,
      duration: opts.duration,
      delay: opts.delay,
      stagger: opts.stagger,
      ease: opts.ease,
      scrollTrigger: {
        trigger: container,
        start: opts.start,
        end: opts.end,
        markers: opts.markers,
        toggleActions: opts.once ? 'play none none none' : 'play reverse play reverse',
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
  }, [selector, opts]);

  return ref;
}

// Parallax effect
export function useParallax<T extends HTMLElement = HTMLDivElement>(
  speed: number = 0.5,
  options: Partial<ScrollAnimationOptions> = {}
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const animation = gsap.to(element, {
      y: () => `${speed * 100}%`,
      ease: 'none',
      scrollTrigger: {
        trigger: element,
        start: options.start || 'top bottom',
        end: options.end || 'bottom top',
        scrub: true,
        markers: options.markers,
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
  }, [speed, options]);

  return ref;
}

// Text reveal animation
export function useTextReveal<T extends HTMLElement = HTMLDivElement>(
  options: Partial<ScrollAnimationOptions> = {}
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const opts = { ...defaultOptions, ...options };

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Split text into lines/words if needed
    const lines = element.querySelectorAll('.line, .word') as NodeListOf<HTMLElement>;
    const targets = lines.length > 0 ? lines : [element];

    // Set initial state
    gsap.set(targets, {
      opacity: 0,
      y: opts.distance,
      clipPath: 'inset(100% 0 0 0)',
    });

    // Animate
    const animation = gsap.to(targets, {
      opacity: 1,
      y: 0,
      clipPath: 'inset(0% 0 0 0)',
      duration: opts.duration,
      delay: opts.delay,
      stagger: lines.length > 0 ? opts.stagger : 0,
      ease: opts.ease,
      scrollTrigger: {
        trigger: element,
        start: opts.start,
        end: opts.end,
        markers: opts.markers,
        toggleActions: opts.once ? 'play none none none' : 'play reverse play reverse',
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
  }, [opts]);

  return ref;
}

// Counter animation
export function useCounterAnimation<T extends HTMLElement = HTMLDivElement>(
  endValue: number,
  options: Partial<ScrollAnimationOptions> & {
    prefix?: string;
    suffix?: string;
    decimals?: number;
  } = {}
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const opts = {
    ...defaultOptions,
    duration: 2,
    ...options,
    prefix: options.prefix || '',
    suffix: options.suffix || '',
    decimals: options.decimals || 0,
  };

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const obj = { value: 0 };

    const animation = gsap.to(obj, {
      value: endValue,
      duration: opts.duration,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: element,
        start: opts.start,
        end: opts.end,
        markers: opts.markers,
        toggleActions: opts.once ? 'play none none none' : 'play reverse play reverse',
      },
      onUpdate: () => {
        element.textContent = `${opts.prefix}${obj.value.toFixed(opts.decimals)}${opts.suffix}`;
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
  }, [endValue, opts]);

  return ref;
}
