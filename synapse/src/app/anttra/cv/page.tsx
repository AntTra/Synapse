import Workspace from "@/components/Workspace";
import Link from "next/link";
export const metadata = { title: "About Anton Tran — Synapse" };
export default function AboutPage() {
  return (
    <Workspace active="about">
      <section className="page-intro">
        <p className="eyebrow">About & CV</p>
        <h1>
          Anton Tran<span className="accent">.</span>
        </h1>
        <p>
          Cybernetics student at NTNU, interested in robotics, state estimation,
          computer vision, and interactive visualisation.
        </p>
        <div className="actions">
          <a className="button primary" href="mailto:anton.tran@live.no">
            Get in touch
          </a>
          <a className="button" href="https://github.com/AntTra">
            GitHub profile
          </a>
        </div>
      </section>
      <div className="resume-grid">
        <section className="panel">
          <p className="eyebrow">Experience</p>
          <h2>KSAT</h2>
          <p>Summer intern · Software development · 2025</p>
        </section>
        <section className="panel">
          <p className="eyebrow">Education</p>
          <h2>NTNU</h2>
          <p>Master’s studies in Cybernetics</p>
          <p>Geology studies</p>
        </section>
        <section className="panel">
          <p className="eyebrow">Tools I work with</p>
          <h2>Code, perception, graphics.</h2>
          <p>
            C++ · Python · TypeScript · React · Next.js · Three.js · Git ·
            Docker
          </p>
        </section>
        <section className="panel">
          <p className="eyebrow">Projects</p>
          <h2>Explore the implementation.</h2>
          <p>
            Browser experiments in live transit data, planetary rendering, and
            facial landmark detection.
          </p>
          <Link className="text-link" href="/anttra/showcase#work">
            View selected work
          </Link>
        </section>
      </div>
    </Workspace>
  );
}
