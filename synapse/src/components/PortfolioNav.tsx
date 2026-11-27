"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

const links = [
  ["/anttra", "Home"], ["/anttra/showcase", "Projects"],
  ["/anttra/dashboard", "Dashboard"], ["/anttra/cv", "About"],
];

export default function PortfolioNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  // Where the sliding indicator sits; null = no nav link matches (e.g. a demo page).
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const active = navRef.current?.querySelector<HTMLElement>('a[aria-current="page"]');
      setBar(active ? { x: active.offsetLeft, w: active.offsetWidth } : null);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [pathname]);

  return <header className="portfolio-bar"><nav ref={navRef} aria-label="Portfolio navigation">
    {links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
    <span
      className="portfolio-indicator"
      aria-hidden="true"
      style={{ width: bar?.w ?? 0, transform: `translateX(${bar?.x ?? 0}px)`, opacity: bar ? 1 : 0 }}
    />
  </nav></header>;
}
