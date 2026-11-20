import Link from "next/link";
import "./workspace.css";

export default function Workspace({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="workspace">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <main id="content">{children}</main>
      <footer className="site-footer">
        <span>Anton Tran · Trondheim, Norway</span>
        <Link href="/">Synapse collective</Link>
        <a href="mailto:anton.tran@live.no">Get in touch</a>
      </footer>
    </div>
  );
}
