'use client';

import { useEffect, useRef } from 'react';
import { isFirefox } from '@/lib/browser';

export default function HeroScene() {
  const mountRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const mobile = window.innerWidth < 768;
    // Firefox's WebGL-in-worker (OffscreenCanvas) path is measurably slower
    // than Chromium's, so treat it like the mobile low-power tier.
    const lowPower = mobile || isFirefox();
    const dpr = Math.min(window.devicePixelRatio, lowPower ? 1 : 1.5);
    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const canvas = document.createElement('canvas');
    // Hidden until the worker has drawn its first frame, then faded in (no blip).
    canvas.style.cssText = 'width:100%;height:100%;display:block;opacity:0;transition:opacity 1.2s cubic-bezier(.22,1,.36,1);';
    mount.appendChild(canvas);

    // OffscreenCanvas not supported (Safari <16.4): no scene, just the intro text
    if (typeof canvas.transferControlToOffscreen !== 'function') {
      return () => { if (mount.contains(canvas)) mount.removeChild(canvas); };
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new Worker(new URL('./heroWorker.ts', import.meta.url));


    let active = true;
    let waiting = true;
    let frameId = 0;
    function schedule() {
      if (!active || waiting || frameId) return;
      frameId = requestAnimationFrame(time => {
        frameId = 0;
        waiting = true;
        worker.postMessage({type: 'frame', time});
      });
    }
    worker.onmessage = (e: MessageEvent<{ type: string }>) => {
      if (e.data.type === 'ready') canvas.style.opacity = '1';
      waiting = false;
      schedule();
    };
    worker.postMessage(
      { type: 'init', canvas: offscreen, w, h, dpr, lowPower },
      [offscreen],
    );

    const onResize = () => {
      worker.postMessage({ type: 'resize', w: mount.clientWidth, h: mount.clientHeight });
    };
    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      worker.postMessage({
        type: 'mousemove',
        x:  ((e.clientX - rect.left) / rect.width)  * 2 - 1,
        y: -((e.clientY - rect.top)  / rect.height) * 2 + 1,
      });
    };
    const onScroll = () => {
      const p = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      worker.postMessage({ type: 'scroll', p });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
      worker.postMessage({ type: 'destroy' });
      active = false;
      cancelAnimationFrame(frameId);
      worker.terminate();
      if (mount.contains(canvas)) mount.removeChild(canvas);
    };
  }, []);

  return <div ref={mountRef} className="home-canvas" aria-hidden="true" />;
}
