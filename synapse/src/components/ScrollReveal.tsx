'use client';

import { useEffect, useRef } from 'react';

// Things that rise into view as you scroll to them. Add data-reveal to opt anything else in.
const TARGETS = [
  '.pf-stagger > *', '.project-grid > *', '.resume-grid > *', '.news-list > *',
  '.dashboard-sidebar > *', '.about-strip', '.site-footer', '[data-reveal]',
].join(', ');

/**
 * Scroll reveal for everything inside it (styles: .pf-pending / .pf-revealed in theme.css).
 * Only elements that start below the fold are hidden; what is on screen at load keeps its
 * normal entrance animation, so nothing flickers. Content that renders later (news, departures,
 * trip results) is picked up through a MutationObserver.
 */
export default function ScrollReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const seen = new WeakSet<Element>();

    const reveal = (els: HTMLElement[]) => {
      els.forEach((el, n) => {
        el.style.animationDelay = `${n * 60}ms`; // items arriving together still stagger
        el.classList.replace('pf-pending', 'pf-revealed');
        io.unobserve(el);
      });
    };

    // Fire once an item is ~15% up from the bottom edge, so the rise happens where you're
    // looking (firing on the first visible pixel finished the animation off-screen).
    const io = new IntersectionObserver(entries => {
      reveal(entries.filter(e => e.isIntersecting).map(e => e.target as HTMLElement));
    }, { rootMargin: '0px 0px -15% 0px' });

    // Items that can never scroll that high (footer, last card) reveal at the end of the page.
    const onScroll = () => {
      if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 4) return;
      reveal([...root.querySelectorAll<HTMLElement>('.pf-pending')]);
    };

    const scan = () => {
      for (const el of root.querySelectorAll<HTMLElement>(TARGETS)) {
        if (seen.has(el)) continue;
        seen.add(el);
        if (el.getBoundingClientRect().top < window.innerHeight) continue; // on screen now
        el.classList.add('pf-pending');
        io.observe(el);
      }
    };
    scan();

    // Coalesce DOM changes into one scan per frame. Never cancel a booked scan: steady changes
    // would otherwise postpone it forever.
    let raf = 0;
    const mo = new MutationObserver(() => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; scan(); });
    });
    mo.observe(root, { childList: true, subtree: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect(); mo.disconnect(); cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return <div ref={ref} className={className}>{children}</div>;
}
