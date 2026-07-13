import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Doomsday Command | ILLCO AI",
  description:
    "A browser-based global nuclear command strategy simulator with mission recording, replay, and MP4 export.",
};

export default function DoomsdayCommandPage() {
  return (
    <main style={{ position: "fixed", inset: 0, background: "#020508" }}>
      <iframe
        src="/doomsday-command/index.html"
        title="Doomsday Command: Aftermath Protocol"
        allow="display-capture; autoplay; fullscreen"
        referrerPolicy="same-origin"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </main>
  );
}
