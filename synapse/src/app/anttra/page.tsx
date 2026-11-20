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
    <Workspace active="showcase">
      <section className="portfolio-hero">
        <div className="hero-copy">
          <p className="eyebrow">Anton Tran / Engineering & exploration</p>
          <h1>
            Making sense
            <br />
            of <em>moving things.</em>
          </h1>
          <p className="hero-description">
            Cybernetics, robotics, and computer vision.
            <br />I build interactive systems that make complex data easier to
            explore.
          </p>
          <div className="actions">
            <a className="button primary" href="#work">
              Explore the work
            </a>
            <Link className="button" href="/anttra/dashboard">
              Open dashboard
            </Link>
          </div>
          <p className="hero-footnote">Based in Trondheim · Studying at NTNU</p>
        </div>
        <div className="signal-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="signal-core" />
          <span className="signal-label">PERCEPTION / SYSTEMS / MOTION</span>
          <svg viewBox="0 0 500 400">
            <path
              className="measurement"
              d="M0 310L55 280L90 295L130 220L165 242L205 155L250 183L290 115L330 133L380 65L425 90L500 20"
            />
            <path
              className="estimate"
              d="M0 320C100 300 110 250 180 215S280 140 340 115S430 60 500 35"
            />
          </svg>
        </div>
      </section>
      <section id="work" className="work-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Selected work</p>
            <h2>Ideas you can interact with.</h2>
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
