import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Workspace from "@/components/Workspace";
import { projects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Anton Tran — Robotics, perception & interactive systems",
  description:
    "Selected web experiments by Anton Tran: real-time transit, interactive graphics, and computer vision.",
};

export default function AnttraPage() {
  return (
    <Workspace>
      <section id="work" className="work-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Anton Tran / Portfolio</p>
            <h1>Selected work</h1>
          </div>
          <span className="muted">Three browser experiments</span>
        </div>
        <div className="project-grid">
          {projects.map((project, index) => (
            <article
              className={`project-card ${index === 0 ? "featured" : ""}`}
              key={project.slug}
            >
              <Link
                className="project-image"
                href={`/anttra/${project.slug}`}
                aria-label={`Open ${project.title}`}
              >
                <Image
                  src={project.image}
                  alt={project.category + " experiment preview"}
                  fill
                  sizes={
                    index === 0
                      ? "(max-width: 760px) 100vw, 55vw"
                      : "(max-width: 760px) 100vw, 35vw"
                  }
                />
              </Link>
              <div className="project-copy">
                <p className="eyebrow">{project.category}</p>
                <h3>
                  <Link href={`/anttra/${project.slug}`}>{project.title}</Link>
                </h3>
                <p>{project.description}</p>
                <p className="project-stack">{project.stack}</p>
                <div className="project-bottom">
                  <Link href={`/anttra/${project.slug}`}>
                    Launch experiment
                  </Link>
                  <span>{project.detail}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="about-strip">
        <div>
          <p className="eyebrow">Behind the experiments</p>
          <h2>Curiosity, with an engineering mindset.</h2>
        </div>
        <div>
          <p>
            My interests sit where perception, control, and visualisation meet.
            Synapse is where I explore those ideas through working browser
            experiments.
          </p>
          <Link className="text-link" href="/anttra/cv">
            More about me
          </Link>
        </div>
      </section>
    </Workspace>
  );
}
