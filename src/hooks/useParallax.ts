import { useEffect, useState, useRef, useCallback } from 'react';

interface ParallaxOptions {
  speed?: number; // Speed multiplier (0.1 = slow, 1 = normal, 2 = fast)
  direction?: 'up' | 'down';
  offset?: number;
}

export function useParallax(options: ParallaxOptions = {}) {
  const { speed = 0.5, direction = 'up', offset = 0 } = options;
  const [transform, setTransform] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!elementRef.current) return;
    
    const rect = elementRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    
    // Calculate the element's position relative to viewport
    const elementTop = rect.top + scrollY;
    const relativeScroll = scrollY - elementTop + windowHeight;
    
    // Apply parallax transformation
    const movement = relativeScroll * speed * (direction === 'up' ? -1 : 1);
    setTransform(movement + offset);
  }, [speed, direction, offset]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return { ref: elementRef, transform };
}

export function useScrollPosition() {
  const [scrollY, setScrollY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      
      setScrollY(currentScrollY);
      setScrollProgress(maxScroll > 0 ? currentScrollY / maxScroll : 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { scrollY, scrollProgress };
}

export function useMouseParallax(sensitivity: number = 0.02) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      const x = (e.clientX - centerX) * sensitivity;
      const y = (e.clientY - centerY) * sensitivity;
      
      setPosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [sensitivity]);

  return position;
}
