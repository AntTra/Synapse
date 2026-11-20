import PortfolioNav from "@/components/PortfolioNav";
import "./theme.css";

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return <div className="anttra-theme"><PortfolioNav />{children}</div>;
}
