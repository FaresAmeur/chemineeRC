import { useState, useRef, useEffect, ReactNode } from 'react';
import { GripHorizontal } from 'lucide-react';

interface DraggablePanelProps {
  children: ReactNode;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function DraggablePanel({ children, initialWidth = 600, minWidth = 300, maxWidth = 1600 }: DraggablePanelProps) {
  const [position, setPosition] = useState({ 
    x: typeof window !== 'undefined' ? window.innerWidth / 2 - initialWidth / 2 : 0, 
    y: typeof window !== 'undefined' ? window.innerHeight - 200 : 0 
  });
  const [width, setWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const dragStartPos = useRef({ x: 0, y: 0, startX: 0, startY: 0, startWidth: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        
        // Empêcher la barre de sortir complètement de l'écran par le haut ou la gauche
        const newX = dragStartPos.current.startX + dx;
        const newY = Math.max(0, dragStartPos.current.startY + dy);

        setPosition({ x: newX, y: newY });
      } else if (isResizing) {
        const dx = e.clientX - dragStartPos.current.x;
        const newWidth = Math.max(minWidth, Math.min(maxWidth, dragStartPos.current.startWidth + dx));
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, minWidth, maxWidth]);

  const startDrag = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY, startX: position.x, startY: position.y, startWidth: width };
  };

  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    dragStartPos.current = { ...dragStartPos.current, x: e.clientX, startWidth: width };
  };

  return (
    <div
      className={`fixed z-50 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl rounded-xl flex flex-col transition-shadow ${isDragging || isResizing ? 'shadow-blue-900/20 shadow-2xl' : ''}`}
      style={{ left: position.x, top: position.y, width: width }}
    >
      <div 
        className="h-6 bg-slate-800/80 rounded-t-xl cursor-move flex items-center justify-center border-b border-slate-700/50 hover:bg-slate-700/80 transition-colors group"
        onMouseDown={startDrag}
        title="Maintenez cliqué pour déplacer"
      >
        <GripHorizontal className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
      </div>
      
      <div className="p-3 relative">
        {children}
        
        {/* Poignée de redimensionnement */}
        <div 
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1 hover:bg-slate-700/30 rounded-br-xl transition-colors"
          onMouseDown={startResize}
          title="Maintenez cliqué pour redimensionner"
        >
          <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 15l-7-7 7-7" transform="translate(-4, 4)" />
          </svg>
        </div>
      </div>
    </div>
  );
}
