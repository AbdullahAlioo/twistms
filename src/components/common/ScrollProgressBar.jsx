import React, { useEffect, useRef } from 'react';

export default function ScrollProgressBar() {
  const barRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (barRef.current) {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = totalHeight > 0 ? window.scrollY / totalHeight : 0;
            barRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[100] bg-transparent pointer-events-none">
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-gradient-to-r from-[#2B2B2B] via-[#B4B4B4] to-[#555555] will-change-transform shadow-sm shadow-[#B4B4B4]/40"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}

