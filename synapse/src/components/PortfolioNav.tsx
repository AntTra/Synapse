"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/anttra", "Home"], ["/anttra/showcase", "Projects"],
  ["/anttra/dashboard", "Dashboard"], ["/anttra/cv", "About"],
];
export default function PortfolioNav() {
  const pathname = usePathname();
  return <header className="portfolio-bar"><nav aria-label="Portfolio navigation">
    {links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
  </nav></header>;
}
