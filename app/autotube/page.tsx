import type { Metadata } from "next";

import { AutoTubeProductionClient } from "./production-client";
import styles from "./autotube.module.css";

export const metadata: Metadata = {
  title: "AutoTube Production | iLLCo AI",
  description:
    "Create narrated prospect videos with server-side rendering, durable MP4 delivery, and mobile-safe downloads.",
};

export default function AutoTubePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.eyebrow}>iLLCo AI · AutoTube 5</div>
        <h1>Prospect videos that finish off-device.</h1>
        <p>
          AutoTube creates narration on the server, sends the composition to a dedicated FFmpeg worker,
          verifies the MP4, and returns a link that plays and downloads on mobile.
        </p>
        <div className={styles.proofRow}>
          <span>1920×1080</span>
          <span>30 FPS</span>
          <span>H.264 + AAC</span>
          <span>Signed delivery</span>
        </div>
      </section>
      <AutoTubeProductionClient />
    </main>
  );
}
