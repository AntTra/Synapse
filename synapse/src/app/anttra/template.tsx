import ScrollReveal from '@/components/ScrollReveal';

// Unlike layout.tsx, a template remounts on every navigation, so each portfolio page
// gets the entrance animation (.pf-page in theme.css) while the nav bar stays put.
// ScrollReveal then reveals below-the-fold content as it scrolls into view.
export default function PortfolioTemplate({ children }: { children: React.ReactNode }) {
  return <ScrollReveal className="pf-page">{children}</ScrollReveal>;
}
