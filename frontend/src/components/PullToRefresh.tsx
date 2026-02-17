import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const pullThreshold = 80;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (containerRef.current?.scrollTop === 0) {
            const startY = e.touches[0].clientY;

            const handleTouchMove = (moveEvent: TouchEvent) => {
                const currentY = moveEvent.touches[0].clientY;
                const distance = currentY - startY;

                if (distance > 0 && containerRef.current?.scrollTop === 0) {
                    // Damping effect
                    const dampenedDistance = Math.pow(distance, 0.8) * 2;
                    setPullDistance(dampenedDistance);

                    if (dampenedDistance > 20) {
                        if (moveEvent.cancelable) moveEvent.preventDefault();
                    }
                }
            };

            const handleTouchEnd = async () => {
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);

                if (pullDistance > pullThreshold) {
                    setIsRefreshing(true);
                    setPullDistance(pullThreshold);

                    // Haptic feedback
                    if ('vibrate' in navigator) {
                        navigator.vibrate(10);
                    }

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

            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);
        }
    };

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            className="relative h-full overflow-auto scroll-smooth"
        >
            <motion.div
                style={{
                    height: pullDistance,
                    opacity: pullDistance / pullThreshold,
                    marginBottom: isRefreshing ? 20 : 0
                }}
                className="flex items-center justify-center overflow-hidden bg-transparent"
            >
                <motion.div
                    animate={isRefreshing ? { rotate: 360 } : { rotate: (pullDistance / pullThreshold) * 180 }}
                    transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : { type: "spring" }}
                    className="text-ruby-600"
                >
                    <RefreshCw className="w-6 h-6" />
                </motion.div>
                <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-charcoal-500">
                    {isRefreshing ? 'Atualizando...' : (pullDistance > pullThreshold ? 'Solte para atualizar' : 'Puxe para atualizar')}
                </span>
            </motion.div>

            <motion.div
                animate={{ y: isRefreshing ? 0 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                {children}
            </motion.div>
        </div>
    );
}
