import Link from "next/link";
import "./workspace.css";

export default function Workspace({
  active,
  children,
}: {
  active: "showcase" | "dashboard" | "about";
  children: React.ReactNode;
}) {
  return (
    <div className="workspace">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="brand" href="/anttra">
          <span className="brand-mark" aria-hidden="true">
            s.
          </span>
          synapse<span className="brand-owner"> / anttra</span>
        </Link>
        <nav aria-label="Main navigation">
          {[
            ["showcase", "/anttra", "Showcase"],
            ["dashboard", "/anttra/dashboard", "Dashboard"],
            ["about", "/anttra/cv", "About & CV"],
          ].map(([id, href, label]) => (
            <Link
              key={id}
              href={href}
              aria-current={active === id ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <a className="header-github" href="https://github.com/AntTra">
          GitHub
        </a>
      </header>
      <main id="content">{children}</main>
      <footer className="site-footer">
        <span>Anton Tran · Trondheim, Norway</span>
        <Link href="/">Synapse collective</Link>
        <a href="mailto:anton.tran@live.no">Get in touch</a>
      </footer>
    </div>
  );
}
