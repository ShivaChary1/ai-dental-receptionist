// Celebration burst in SmileDesk brand colors. Lazy-loads canvas-confetti so it
// never weighs on the initial bundle; no-ops under prefers-reduced-motion.
const BRAND = ["#0FA6A0", "#2CC5BE", "#8AE8E2", "#F5B841"];

export async function celebrate() {
  if (
    typeof window === "undefined" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  const confetti = (await import("canvas-confetti")).default;
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { y: 0.6 },
    colors: BRAND,
    ticks: 180,
    scalar: 0.9,
    disableForReducedMotion: true,
  });
  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 100,
      startVelocity: 35,
      origin: { y: 0.55 },
      colors: BRAND,
      scalar: 0.8,
      disableForReducedMotion: true,
    });
  }, 180);
}
