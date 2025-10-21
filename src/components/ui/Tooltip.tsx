/**
 * Tooltip Component
 * Tooltip informativo sin dependencias externas
 */

import { useState, useRef, ReactNode, CSSProperties } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ content, children, position = 'top', delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({ x: rect.left + rect.width / 2, y: rect.top });
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const getPositionStyles = (): CSSProperties => {
    const base = {
      position: 'fixed' as const,
      zIndex: 9999,
      pointerEvents: 'none' as const,
    };

    switch (position) {
      case 'top':
        return {
          ...base,
          left: `${coords.x}px`,
          top: `${coords.y - 8}px`,
          transform: 'translate(-50%, -100%)',
        };
      case 'bottom':
        return {
          ...base,
          left: `${coords.x}px`,
          top: `${coords.y + 8}px`,
          transform: 'translate(-50%, 0)',
        };
      case 'left':
        return {
          ...base,
          left: `${coords.x - 8}px`,
          top: `${coords.y}px`,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          ...base,
          left: `${coords.x + 8}px`,
          top: `${coords.y}px`,
          transform: 'translate(0, -50%)',
        };
    }
  };

  const getArrowStyles = (): CSSProperties => {
    const base = {
      position: 'absolute' as const,
      width: 0,
      height: 0,
      borderStyle: 'solid',
    };

    switch (position) {
      case 'top':
        return {
          ...base,
          bottom: '-4px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '4px 4px 0 4px',
          borderColor: '#00ff88 transparent transparent transparent',
        };
      case 'bottom':
        return {
          ...base,
          top: '-4px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '0 4px 4px 4px',
          borderColor: 'transparent transparent #00ff88 transparent',
        };
      case 'left':
        return {
          ...base,
          right: '-4px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '4px 0 4px 4px',
          borderColor: 'transparent transparent transparent #00ff88',
        };
      case 'right':
        return {
          ...base,
          left: '-4px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '4px 4px 4px 0',
          borderColor: 'transparent #00ff88 transparent transparent',
        };
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && (
        <div
          style={getPositionStyles()}
          className={`
            px-3 py-1.5 bg-[#0d0d0d] border border-[#00ff88] rounded-lg
            text-xs text-[#00ff88] font-medium whitespace-nowrap
            shadow-[0_0_20px_rgba(0,255,136,0.4)]
            animate-fade-in
          `}
        >
          {content}
          <div style={getArrowStyles()} />
        </div>
      )}
    </>
  );
}
