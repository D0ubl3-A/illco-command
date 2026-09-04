import type { Metadata } from "next";
import Link from "next/link";
import styles from "./games.module.css";

export const metadata: Metadata = {
  title: "iLLCo Games | AI-Powered Playable Worlds",
  description:
    "Explore iLLCo Games: WorldForge real-world-to-game technology, JC: The Holy OG, ReelWorld, and custom AI-powered game development.",
  alternates: { canonical: "/games" },
  openGraph: {
    title: "iLLCo Games | AI-Powered Playable Worlds",
    description: "Real-world data, AI world generation, persistent agents, and playable experiences from iLLCo Games.",
    url: "https://illcoai.tech/games",
    type: "website",
    images: [{ url: "/media/illco-command-header-loop-poster.jpg", width: 1200, height: 630, alt: "iLLCo Games" }],
  },
};

const projects = [
  {
    kicker: "WORLD TECHNOLOGY",
    title: "WorldForge",
    copy: "A pipeline for turning real-world geographic data, imagery, structured assets, and AI-generated content into optimized playable environments.",
    tags: ["Real-world mapping", "AI asset pipeline", "3D worlds", "Simulation"],
  },
  {
    kicker: "FLAGSHIP WORLD",
    title: "JC: The Holy OG",
    copy: "A large-scale Sin City experiment built around flight, traversal, agents, landmarks, neighborhoods, and an evolving open-world gameplay stack.",
    tags: ["Open world", "Las Vegas", "Agents", "Traversal"],
  },
  {
    kicker: "AR / REAL WORLD",
    title: "ReelWorld",
    copy: "A camera-aware fishing and hunting concept designed to recognize real-world environments and turn physical spaces into interactive game surfaces.",
    tags: ["AR fishing", "Computer vision", "Mobile", "Real-world play"],
  },
];

export default function GamesPage() {
  return (
    <main className={styles.page} id="main-content">
      <section className={styles.hero}>
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.inner}>
          <span className={styles.eyebrow}>iLLCo GAMES</span>
          <h1>We turn ideas, data, and real places into playable worlds.</h1>
          <p>
            AI-assisted world generation, game systems, real-world mapping, agent-driven characters,
            interactive simulations, and custom playable experiences.
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} href="#projects">Explore the worlds</a>
            <a className={styles.secondary} href="#build">Build a game with us</a>
          </div>
          <div className={styles.metrics}>
            <span><strong>AI</strong> world pipelines</span>
            <span><strong>3D</strong> playable environments</span>
            <span><strong>AR</strong> real-world interaction</span>
            <span><strong>AGENTS</strong> persistent characters</span>
          </div>
        </div>
      </section>

      <section className={styles.projects} id="projects">
        <div className={styles.inner}>
          <div className={styles.sectionHeading}>
            <span>THE LAB</span>
            <h2>What iLLCo Games is building</h2>
            <p>Different products, one core idea: make game creation faster, smarter, and more connected to the real world.</p>
          </div>
          <div className={styles.projectGrid}>
            {projects.map((project, index) => (
              <article className={styles.projectCard} key={project.title}>
                <div className={styles.number}>{String(index + 1).padStart(2, "0")}</div>
                <span className={styles.kicker}>{project.kicker}</span>
                <h3>{project.title}</h3>
                <p>{project.copy}</p>
                <div className={styles.tags}>
                  {project.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.pipeline}>
        <div className={styles.inner}>
          <div className={styles.sectionHeading}>
            <span>WORLD FORGE PIPELINE</span>
            <h2>From source data to interaction</h2>
          </div>
          <div className={styles.steps}>
            {["Capture", "Interpret", "Generate", "Optimize", "Populate", "Play"].map((step, index) => (
              <div className={styles.step} key={step}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.build} id="build">
        <div className={styles.inner}>
          <div className={styles.buildCard}>
            <span className={styles.eyebrow}>CUSTOM GAME BUILDS</span>
            <h2>Have a game idea that sounds impossible?</h2>
            <p>
              Bring us the concept. We&apos;ll break it into a playable technical path — prototype, world,
              systems, AI, controls, assets, deployment, and the shortest route to proof.
            </p>
            <div className={styles.actions}>
              <a className={styles.primary} href="mailto:admin@illcoai.tech?subject=iLLCo%20Games%20custom%20build">Pitch your game</a>
              <Link className={styles.secondary} href="/#catalog">See AI products</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
