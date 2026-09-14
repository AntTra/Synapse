'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import West from '@mui/icons-material/West';
import ArrowOutward from '@mui/icons-material/ArrowOutward';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const SNAP_COOLDOWN_MS = 500;

// swap for next/font Instrument_Serif if you want the real face:
// const serif = Instrument_Serif({ weight: '400', style: 'italic', subsets: ['latin'] });
const SERIF_STACK = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";

const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false });

type ShowcaseItem = {
  label: string; sub: string; href: string; accent: string; live: boolean;
  imgSrc?: string; cssBg?: string;
};

const showcase: ShowcaseItem[] = [
  { label: 'CV',            sub: 'BIOGRAPHY',             href: '/anttra/cv',        accent: '#d0c090', live: true,  cssBg: 'linear-gradient(135deg, #0c0c10 0%, #181820 100%)' },
  { label: 'BUSROUTES',     sub: 'REAL-TIME TRANSIT MAP', href: '/anttra/busroutes', accent: '#4488ff', live: true,  imgSrc: '/busroutes.png' },
  { label: 'VERTEX GLOBES', sub: '3D · THREE.JS',         href: '/anttra/globe',     accent: '#5599ff', live: true,  imgSrc: '/globe.png' },
  { label: 'FACE MESH',     sub: 'ML · VISION',           href: '/anttra/facemesh',  accent: '#cc44ff', live: true,  imgSrc: '/facemesh.png' },
  { label: 'MASTER THESIS', sub: 'RL-MPC · AUTONOMY',     href: '/anttra/master',    accent: '#e08030', live: false, cssBg: 'linear-gradient(160deg, #120e06 0%, #1e1508 100%)' },
  { label: 'LANDMARK CTRL', sub: 'HAND TRACKING',         href: '/anttra/landmark',  accent: '#66aaff', live: false, cssBg: 'radial-gradient(ellipse at 70% 30%, #040e1a 0%, #040404 70%)' },
];

const BG = '#0b0f16';
const MIN_LOADING_MS = 800;

export default function AnttraPage() {
  const loadingRef   = useRef<HTMLDivElement>(null);
  const horizRef     = useRef<HTMLElement>(null);
  const trackRef     = useRef<HTMLDivElement>(null);
  const bannerRef    = useRef<HTMLDivElement>(null);
  const progressRef  = useRef<HTMLDivElement>(null);
  const heroTlRef    = useRef<gsap.core.Timeline | null>(null);
  const showcaseStRef  = useRef<ScrollTrigger | null>(null);
  const loadStartRef = useRef(Date.now());
  const [, setSceneReady] = useState(false);

  const handleSceneReady = useCallback(() => {
    const elapsed   = Date.now() - loadStartRef.current;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
    setTimeout(() => {
      gsap.to(loadingRef.current, {
        opacity: 0, duration: 0.7, ease: 'power2.inOut',
        onComplete: () => {
          if (loadingRef.current) loadingRef.current.style.display = 'none';
          document.body.style.overflow = '';
          setSceneReady(true);
          heroTlRef.current?.play();
        },
      });
    }, remaining);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      gsap.set('.main-title', { willChange: 'transform' });

      /* ── hero entrance ── */
      const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' }, paused: true });
      heroTl
        .from('.nav-bar',          { opacity: 0, y: -18, duration: 0.8 })
        .from('.main-title',       { opacity: 0, y: 80, filter: 'blur(28px)', duration: 2.4, ease: 'expo.out' }, '-=0.4')
        .set ('.main-title',       { clearProps: 'filter' })
        .from('.hero-line',        { scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'expo.out' }, '-=1.6')
        .from('.hero-meta > span', { opacity: 0, y: 10, stagger: 0.1, duration: 0.7 }, '-=1.1')
        .from('.hero-legend > *',  { opacity: 0, x: -8, stagger: 0.12, duration: 0.8 }, '-=0.9')
        .from('.scroll-hint',      { opacity: 0, y: 8, duration: 0.8 }, '-=0.4');
      heroTlRef.current = heroTl;
      if (reduced) { heroTl.progress(1); }

      gsap.to('.main-title', {
        yPercent: -22, ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: 1.5 },
      });
      gsap.to('.scroll-hint', {
        opacity: 0, ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'top top', end: '+=180', scrub: 1 },
      });

      /* ── showcase horizontal scroll ── */
      const track   = trackRef.current;
      const section = horizRef.current;
      if (track && section) {
        gsap.set(track, { willChange: 'transform' });

        const cards = track.querySelectorAll('.showcase-card');
        if (cards.length) {
          gsap.from(cards, {
            y: 55, scale: 0.92,
            duration: 1.0, stagger: 0.09, ease: 'expo.out',
            scrollTrigger: { trigger: section, start: 'top 85%', toggleActions: 'play none none none' },
          });
        }

        const showcaseTween = gsap.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: section, pin: true, scrub: 1,
            end: () => `+=${track.scrollWidth - window.innerWidth}`,
            invalidateOnRefresh: true,
          },
        });
        showcaseStRef.current = showcaseTween.scrollTrigger ?? null;
      }

      /* ── outro ── */
      gsap.from('.outro-line', {
        opacity: 0, y: 50, stagger: 0.15, duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: '.outro-section', start: 'top 70%', once: true },
      });
      gsap.from('.outro-links > *', {
        opacity: 0, y: 14, stagger: 0.1, duration: 0.8,
        scrollTrigger: { trigger: '.outro-section', start: 'top 55%', once: true },
      });

      /* ── fixed banner + progress ── */
      gsap.to(bannerRef.current, {
        opacity: 1, ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'bottom 75%', end: 'bottom 45%', scrub: true },
      });
      /* whole-document scroll progress (pinned sections inflate body height,
         so top→bottom already accounts for the showcase's horizontal run) */
      gsap.fromTo(progressRef.current,
        { scaleX: 0 },
        {
          scaleX: 1, ease: 'none',
          scrollTrigger: {
            trigger: document.documentElement,
            start: 'top top', end: 'bottom bottom',
            scrub: 0.3, invalidateOnRefresh: true,
          },
        });
    });

    /* ── per-slide snap scrolling ──
       One wheel gesture = one "slide": the hero, each showcase card, and
       the outro. Stops are absolute document scroll positions, recomputed
       only on ScrollTrigger.refresh (never mid-gesture) — the showcase
       elements are pinned or transformed by GSAP, so reading their live
       getBoundingClientRect()
       while scrolled gives a moving target. */
    let snapping = false;
    let unlockTimer: ReturnType<typeof setTimeout> | null = null;
    let snapStops: number[] = [];

    const recomputeSnapStops = () => {
      const stops: number[] = [0];

      const showcaseSt = showcaseStRef.current;
      const track = trackRef.current;
      if (showcaseSt && track) {
        const cards = Array.from(track.querySelectorAll<HTMLElement>('.showcase-card'));
        const maxX = track.scrollWidth - window.innerWidth;
        cards.forEach((card) => {
          const centerX = card.offsetLeft + card.offsetWidth / 2 - window.innerWidth / 2;
          const x = Math.min(Math.max(centerX, 0), maxX);
          stops.push(showcaseSt.start + x);
        });
      }

      const outro = document.querySelector<HTMLElement>('.outro-section');
      if (outro) {
        const top = outro.getBoundingClientRect().top + window.scrollY;
        stops.push(Math.min(top, document.documentElement.scrollHeight - window.innerHeight));
      }

      snapStops = Array.from(new Set(stops)).sort((a, b) => a - b);
    };

    recomputeSnapStops();
    ScrollTrigger.addEventListener('refresh', recomputeSnapStops);
    /* ScrollTrigger debounces its own resize handling, but drive it
       explicitly too so a resolution/orientation change always lands a
       refresh (and thus a snapStops recompute) rather than depending on
       internals we don't control. */
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
    };
    window.addEventListener('resize', onResize);

    const onWheel = (e: WheelEvent) => {
      if (snapping) {
        e.preventDefault();
        if (unlockTimer) clearTimeout(unlockTimer);
        unlockTimer = setTimeout(() => { snapping = false; }, SNAP_COOLDOWN_MS);
        return;
      }

      const dir = e.deltaY > 0 ? 1 : -1;
      const y = window.scrollY;
      const EPS = 4;
      const target = dir > 0
        ? snapStops.find(s => s > y + EPS)
        : [...snapStops].reverse().find(s => s < y - EPS);
      if (target === undefined) return;

      e.preventDefault();
      snapping = true;
      gsap.to(window, {
        scrollTo: { y: target, autoKill: false },
        duration: reduced ? 0 : 0.7, ease: 'power2.inOut', overwrite: true,
        onComplete: () => { unlockTimer = setTimeout(() => { snapping = false; }, SNAP_COOLDOWN_MS); },
      });
    };
    window.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      ctx.revert();
      ScrollTrigger.removeEventListener('refresh', recomputeSnapStops);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      if (unlockTimer) clearTimeout(unlockTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <>
    <div ref={loadingRef} className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ background: BG, willChange: 'opacity' }}>
      <p className="font-mono text-[clamp(2rem,8vw,5rem)] tracking-[0.25em] text-[#d0d0d0] opacity-70 select-none">
        anttra
      </p>
      <div className="mt-8 w-32 h-px bg-white/10 relative overflow-hidden">
        <div style={{ animation: 'loadSlide 1.1s ease-in-out infinite alternate',
          position: 'absolute', inset: 0, width: '33%', background: 'rgba(255,255,255,0.45)' }} />
      </div>
      <style>{`@keyframes loadSlide{from{transform:translateX(-100%)}to{transform:translateX(400%)}}`}</style>
    </div>

    <div style={{ background: BG }} className="text-[#cfd6de] selection:bg-white selection:text-black">

      {/* film grain + scanlines + vignette */}
      <div className="fixed inset-0 pointer-events-none z-10" style={{
        backgroundImage: [
          `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)',
          'radial-gradient(ellipse at 50% 55%, transparent 55%, rgba(0,0,0,0.3) 100%)',
        ].join(','),
        backgroundSize: '200px 200px, auto, auto',
      }} />

      {/* fixed banner */}
      <div ref={bannerRef} className="fixed top-0 left-0 right-0 z-30 pointer-events-none" style={{ opacity: 0 }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(11,15,22,0.85) 0%, transparent 100%)' }} />
        <div className="relative flex items-center justify-between px-8 md:px-16 py-4">
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-35">anttra</span>
          <div className="w-24 h-px bg-white/12 overflow-hidden">
            <div ref={progressRef} className="h-full w-full bg-white/45 origin-left" style={{ transform: 'scaleX(0)' }} />
          </div>
        </div>
      </div>

      {/* global ambient gradient blobs */}
      <div className="fixed pointer-events-none z-0 inset-0" style={{
        background: [
          'radial-gradient(ellipse at 88% 8%,  rgba(20,70,110,0.16)  0%, transparent 52%)',
          'radial-gradient(ellipse at 10% 92%, rgba(224,128,48,0.03) 0%, transparent 48%)',
          'radial-gradient(ellipse at 50% 50%, rgba(30,80,80,0.03)   0%, transparent 60%)',
        ].join(','),
      }} />

      {/* ── HERO ── */}
      <section className="hero-section relative flex flex-col min-h-screen px-8 md:px-16">
        <div className="absolute inset-0 z-0">
          <HeroScene onReady={handleSceneReady} />
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(to bottom, rgba(11,15,22,0.05) 0%, transparent 35%, rgba(11,15,22,0.25) 100%)` }} />
        </div>

        <div className="nav-bar relative z-10 flex items-center justify-between pt-8 pb-0">
          <Link href="/" className="font-mono text-[10px] tracking-[0.3em] opacity-35 hover:opacity-100 transition-opacity uppercase">
            <West sx={{ fontSize: 10 }} /> return
          </Link>
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-25">68°26′ N</span>
        </div>

        <div className="flex-1 relative z-10 flex flex-col justify-center py-16 pointer-events-none">
          <p className="hero-meta font-mono text-[10px] tracking-[0.32em] uppercase mb-5">
            <span className="opacity-45">state estimation · robotics · perception</span>
          </p>
          <h1 className="main-title font-mono font-light leading-[0.85] tracking-[-0.03em] text-[#dde3ea]"
            style={{ fontSize: 'clamp(4rem, 17vw, 13rem)', willChange: 'transform' }}>
            anttra
          </h1>
          <div className="mt-5 mb-4">
            <div className="hero-line h-px bg-white/10 max-w-4xl" />
          </div>
          <div className="hero-meta flex flex-wrap items-center gap-4 font-mono text-[10px] tracking-[0.22em] uppercase">
            <span className="opacity-40">Cybernetics</span>
            <span className="opacity-20">·</span>
            <span className="opacity-40">Robotics</span>
            <span className="opacity-20">·</span>
            <span className="opacity-40">Geology</span>
          </div>
        </div>

        {/* legend: read the scene */}
        <div className="hero-legend absolute right-8 md:right-16 bottom-24 z-10 flex flex-col gap-2 font-mono text-[9px] tracking-[0.24em] uppercase pointer-events-none">
          <span className="flex items-center gap-3 opacity-45">
            <i className="inline-block w-2 h-2 rounded-full" style={{ background: '#f0a050' }} /> measurement
          </span>
          <span className="flex items-center gap-3 opacity-45">
            <i className="inline-block w-6 h-px" style={{ background: '#8fd4ff' }} /> estimate
          </span>
        </div>

        <div className="scroll-hint relative z-10 pb-10 flex items-center gap-3 font-mono text-[9px] tracking-[0.3em] uppercase opacity-25">
          <span>scroll</span>
          <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
            <path d="M0 5h18M14 1l4 4-4 4" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </div>
      </section>

      {/* ── SHOWCASE ── */}
      <section ref={horizRef} className="relative z-20 overflow-hidden" style={{ height: '100vh' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(30,70,160,0.07) 0%, transparent 65%)' }} />
        <div className="absolute left-8 md:left-16 top-8 z-10 flex items-center gap-3">
          <div className="h-px w-6 bg-white/30" />
          <span className="font-mono text-[11px] tracking-[0.4em] uppercase text-white/55">selected work</span>
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-white/25">— {showcase.length} entries</span>
        </div>
        <div ref={trackRef} className="flex items-center h-full gap-[2vw]"
          style={{ paddingLeft: '8vw', paddingRight: '8vw', width: 'fit-content', willChange: 'transform' }}>
          {showcase.map((item, i) => (
            <ShowcaseCard key={i} item={item} index={i} total={showcase.length} />
          ))}
        </div>
      </section>

      {/* ── OUTRO ── */}
      <section className="outro-section relative z-20 min-h-[70vh] flex flex-col justify-center px-8 md:px-16 py-24"
        style={{ borderTop: '1px solid rgba(208,214,222,0.06)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 80%, rgba(224,128,48,0.04) 0%, transparent 55%)' }} />
        <h2 className="relative font-light leading-[0.95] tracking-[-0.02em] text-[#e4e9ef]"
          style={{ fontSize: 'clamp(2.6rem, 8vw, 6.5rem)' }}>
          <span className="outro-line block">signal,</span>
          <span className="outro-line block" style={{ fontFamily: SERIF_STACK, fontStyle: 'italic', color: '#8fd4ff' }}>from noise.</span>
        </h2>
        <div className="outro-links relative mt-14 flex flex-wrap items-center gap-8 font-mono text-[10px] tracking-[0.26em] uppercase">
          <a href="https://github.com/AntTra" target="_blank" rel="noreferrer"
            className="opacity-40 hover:opacity-100 hover:tracking-[0.4em] transition-all duration-500">
            github <ArrowOutward sx={{ fontSize: 9, verticalAlign: 'middle' }} />
          </a>
          <Link href="/anttra/cv"
            className="opacity-40 hover:opacity-100 hover:tracking-[0.4em] transition-all duration-500">
            cv <ArrowOutward sx={{ fontSize: 9, verticalAlign: 'middle' }} />
          </Link>
          <span className="opacity-20">© {new Date().getFullYear()} · narvik / trondheim, no</span>
        </div>
      </section>
    </div>
    </>
  );
}


function ShowcaseCard({ item, index, total }: { item: ShowcaseItem; index: number; total: number }) {
  const [hovered, setHovered] = useState(false);
  const num = String(index + 1).padStart(2, '0');

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="showcase-card relative flex-shrink-0 overflow-hidden"
      style={{
        width: 'min(70vw, 660px)',
        height: 'min(78vh, 640px)',
        borderRadius: 2,
        background: '#080808',
        scrollSnapAlign: 'center',
        outline: hovered ? `1px solid ${item.accent}88` : '1px solid rgba(208,214,222,0.1)',
        transition: 'outline 0.3s, box-shadow 0.4s',
        boxShadow: hovered ? `0 0 40px ${item.accent}1a` : 'none',
      }}
    >
      <div
        className="absolute inset-0 transition-transform duration-700"
        style={{
          background: item.imgSrc
            ? `url(${item.imgSrc}) center/cover no-repeat`
            : item.cssBg,
          transform: hovered ? 'scale(1.05)' : 'scale(1.12)',
          filter: hovered ? 'saturate(1)' : 'saturate(0.75)',
          transition: 'transform 0.7s, filter 0.7s',
        }}
      />

      {/* gradient overlay */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.18) 42%, rgba(0,0,0,0.04) 100%)' }} />

      {/* accent top border */}
      <div className="absolute top-0 left-0 right-0 h-px transition-opacity duration-300"
        style={{ background: item.accent, opacity: hovered ? 0.8 : 0.25 }} />

      {/* content */}
      <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-10">
        <div className="flex items-start justify-between">
          <span className="font-mono text-[11px] tracking-[0.2em]"
            style={{ color: item.accent, opacity: 0.4 }}>
            {num} <span style={{ opacity: 0.5 }}>/ {String(total).padStart(2, '0')}</span>
          </span>
          <span className="font-mono text-[10px] tracking-[0.28em] uppercase"
            style={{ color: item.accent, opacity: 0.85 }}>
            {item.sub}
          </span>
        </div>
        <div className="card-label" style={{ transform: hovered ? 'translateY(-6px)' : 'none', transition: 'transform 0.5s' }}>
          <div className="h-px mb-5"
            style={{ background: `linear-gradient(90deg, ${item.accent}99, transparent)`, width: hovered ? 96 : 56, transition: 'width 0.5s' }} />
          <h2 className="font-mono font-light tracking-tight"
            style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3.2rem)', color: '#f4f4f4', lineHeight: 0.9 }}>
            {item.label}
          </h2>
          <span className="block font-mono text-[10px] tracking-[0.22em] uppercase mt-4 transition-all duration-300"
            style={{ color: item.live ? item.accent : 'rgba(208,214,222,0.25)', opacity: item.live ? (hovered ? 1 : 0.45) : 0.3 }}>
            {item.live ? <span>view project <ArrowOutward sx={{ fontSize: 9, verticalAlign: 'middle' }} /></span> : 'wip'}
          </span>
        </div>
      </div>

      {item.live && <Link href={item.href} className="absolute inset-0" />}
    </div>
  );
}
