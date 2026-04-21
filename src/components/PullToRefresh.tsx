import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../utils/helpers';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, className }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  
  const PULL_THRESHOLD = 80;
  const MAX_PULL = 150;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only allow pull to refresh if we are at the top of the container
      if (container.scrollTop === 0) {
        startY = e.touches[0].pageY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      const currentY = e.touches[0].pageY;
      const diff = currentY - startY;

      if (diff > 0) {
        // Prevent default scrolling when pulling down
        if (e.cancelable) e.preventDefault();
        
        // Apply resistance
        const distance = Math.min(diff * 0.4, MAX_PULL);
        setPullDistance(distance);
      } else {
        isPulling = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling || isRefreshing) return;
      isPulling = false;

      if (pullDistance >= PULL_THRESHOLD) {
        setIsRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh]);

  return (
    <div ref={containerRef} className={cn("overflow-y-auto relative no-scrollbar", className)}>
      {/* Pull Indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-50"
        style={{ 
          top: -40, 
          transform: `translateY(${pullDistance}px)`,
          opacity: Math.min(pullDistance / PULL_THRESHOLD, 1)
        }}
      >
        <div className="bg-brand-primary text-black p-2 rounded-full shadow-lg">
          <RefreshCw 
            size={20} 
            className={isRefreshing ? "animate-spin" : ""} 
            style={{ transform: `rotate(${pullDistance * 2}deg)` }}
          />
        </div>
      </div>

      {/* Content */}
      <motion.div
        animate={{ y: pullDistance }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </div>
  );
};
