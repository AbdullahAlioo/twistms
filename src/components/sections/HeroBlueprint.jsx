import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import SplitText from '../motion/SplitText';
import MagneticButton from '../motion/MagneticButton';
import HeroFallback from './HeroFallback';
import { EASE } from '../../lib/motion';

/**
 * High-performance Blueprint Hero.
 * Renders the luxury architectural stage with natural page flow and zero scroll lag.
 */
export default function HeroBlueprint() {
  const reduce = useReducedMotion();

  const enter = (delay = 0, dist = 16) => ({
    initial: reduce ? false : { opacity: 0, y: dist },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: EASE, delay },
  });

  return (
    <section className="relative min-h-[82vh] lg:min-h-[88vh] flex items-center bg-[#0E141B] text-[#F4F4F4] overflow-hidden" aria-label="Where vision becomes reality">
      {/* ---------- Architectural Blueprint Illustration Stage ---------- */}
      <HeroFallback animate={!reduce} />

      {/* Readability Gradients */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#0E141B]/95 via-[#0E141B]/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none bg-gradient-to-t from-[#0E141B]/90 to-transparent" />

      {/* ---------- Technical Blueprint Annotations ---------- */}
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
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-16 sm:py-20">
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
