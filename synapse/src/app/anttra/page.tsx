import Link from "next/link";
import HeroScene from "./HeroScene";

export const metadata = { title: "Anton Tran · Cybernetics & Robotics" };

export default function AnttraPage() {
  return (
    <main className="scene-home">
      <HeroScene />
      <section className="home-intro pf-stagger" aria-labelledby="home-name">
        <p className="home-handle">anttra</p>
        <h1 id="home-name">Anton Tran</h1>
        <p className="home-title">Cybernetics &amp; Robotics</p>
        <p className="home-focus">Master’s student at NTNU working on state estimation and perception.</p>
        <Link className="portfolio-control home-projects" href="/anttra/showcase">Explore projects</Link>
      </section>
    </main>
  );
}
