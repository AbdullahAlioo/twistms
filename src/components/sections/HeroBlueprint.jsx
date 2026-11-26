import React, { Suspense, lazy, useRef, useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import SplitText from '../motion/SplitText';
import MagneticButton from '../motion/MagneticButton';
import HeroFallback from './HeroFallback';
import { useWebGLSupport } from '../../three/useWebGLSupport';
import { DIMENSIONS } from '../../three/dimensions';
import { EASE } from '../../lib/motion';

const HeroScene = lazy(() => import('../../three/HeroScene'));

/**
 * 3D Blueprint Hero.
 * The 3D architectural villa automatically animates into existence with real-time mouse parallax,
 * while keeping natural page scrolling with zero lag or scroll-locking.
 */
export default function HeroBlueprint() {
  const stageRef = useRef(null);
  const labelEls = useRef([]);
  const reduce = useReducedMotion();
  const { supported, quality } = useWebGLSupport();

  const [visible, setVisible] = useState(true);

  // Mouse interaction for 3D parallax
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mouseX = useSpring(rawX, { stiffness: 80, damping: 25, mass: 0.8 });
  const mouseY = useSpring(rawY, { stiffness: 80, damping: 25, mass: 0.8 });

  const onPointerMove = (e) => {
    if (reduce || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    rawX.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    rawY.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };

  const onPointerLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const enter = (delay = 0, dist = 16) => ({
    initial: reduce ? false : { opacity: 0, y: dist },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: EASE, delay },
  });

  const sceneProps = useMemo(
    () => ({ progress: null, mouseX, mouseY, quality, labelEls }),
    [mouseX, mouseY, quality]
  );

  return (
    <section
      ref={stageRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative min-h-[84vh] lg:min-h-[90vh] flex items-center bg-[#0E141B] text-[#F4F4F4] overflow-hidden"
      aria-label="Where vision becomes reality"
    >
      {/* ---------- 3D Architectural Stage ---------- */}
      <div className="absolute inset-0">
        {supported ? (
          <Suspense fallback={<HeroFallback animate={!reduce} />}>
            <HeroScene {...sceneProps} active={visible} frozenProgress={reduce ? 0.72 : null} />
          </Suspense>
        ) : (
          <HeroFallback animate={!reduce} />
        )}
      </div>

      {/* Readability Gradients */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#0E141B]/95 via-[#0E141B]/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-36 pointer-events-none bg-gradient-to-t from-[#0E141B]/95 to-transparent" />

      {/* Projected Dimension Labels */}
      <div className="absolute inset-0 pointer-events-none hidden sm:block" aria-hidden="true">
        {DIMENSIONS.map((d, i) => (
          <span
            key={d.label}
            ref={(el) => (labelEls.current[i] = el)}
            className="absolute top-0 left-0 px-1.5 py-0.5 rounded bg-[#0E141B]/70 border border-[#8BAFD0]/40 text-[#8BAFD0] font-mono text-[10px] tracking-widest whitespace-nowrap will-change-transform"
            style={{ opacity: 0 }}
          >
            {d.label}
          </span>
        ))}
      </div>

      {/* Technical Blueprint Annotations */}
      <div className="absolute inset-0 pointer-events-none hidden md:block" aria-hidden="true">
        <div className="absolute top-8 right-8 lg:right-12 text-right font-mono text-[10px] tracking-[0.3em] uppercase text-[#8BAFD0]/80 space-y-1">
          <p>Structure 001</p>
          <p className="text-[#F4F4F4]/50">Architectural form</p>
        </div>
        <div className="absolute bottom-12 right-8 lg:right-12 text-right font-mono text-[10px] tracking-[0.3em] uppercase text-[#8BAFD0]/80 space-y-1">
          <p>Location / USA</p>
          <p className="text-[#F4F4F4]/50">N 39.8283° · W 98.5795°</p>
        </div>
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] uppercase text-[#F4F4F4]/45">
          <span className="w-8 h-px bg-[#8BAFD0]/50" />
          Blueprint to reality
          <span className="w-8 h-px bg-[#8BAFD0]/50" />
        </div>
      </div>

      {/* ---------- Hero Copy & Actions ---------- */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-16 sm:py-24">
        <div className="max-w-xl lg:max-w-2xl">
          <motion.p {...enter(0.1)} className="font-mono text-[11px] tracking-[0.35em] uppercase text-[#B4B4B4] font-bold">
            Real Estate, Reimagined.
          </motion.p>
          <SplitText
            as="h1"
            text="Where Vision Becomes Reality."
            className="mt-4 text-4xl sm:text-6xl lg:text-[4.75rem] font-extrabold tracking-tight leading-[1.02] font-editorial text-[#F4F4F4]"
            delay={0.2}
            stagger={0.05}
          />
          <motion.p {...enter(0.45)} className="mt-5 text-base sm:text-lg text-[#F4F4F4]/80 leading-relaxed font-medium max-w-lg text-balance">
            Discover exceptional properties, explore new opportunities and find your next place across the United States.
          </motion.p>
          <motion.div {...enter(0.65, 20)} className="mt-8 flex flex-wrap items-center gap-4">
            <MagneticButton>
              <Link
                to="/search"
                className="inline-flex items-center gap-2 py-3.5 px-7 rounded-2xl text-[11px] font-extrabold tracking-[0.2em] uppercase bg-[#B4B4B4] text-[#111111] hover:bg-[#E2E2E2] transition-colors duration-300 shadow-[0_18px_40px_-16px_rgba(180, 180, 180,0.7)]"
              >
                Explore Properties
                <span aria-hidden="true">→</span>
              </Link>
            </MagneticButton>
            <MagneticButton>
              <Link to="/submit" className="btn-ghost-light inline-flex items-center py-3.5 px-7 rounded-2xl text-[11px] tracking-[0.2em] uppercase">
                List Your Property
              </Link>
            </MagneticButton>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
