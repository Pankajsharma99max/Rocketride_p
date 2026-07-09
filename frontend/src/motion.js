// Shared motion tokens so every section of the site animates on the same
// curve/timing instead of each component inventing its own easing.
export const EASE = [0.16, 1, 0.3, 1] // Apple-style easeOutExpo

export function reveal(delay = 0, distance = 24) {
  return {
    initial: { opacity: 0, y: distance },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, ease: EASE, delay },
  }
}

export function fadeIn(delay = 0) {
  return {
    initial: { opacity: 0 },
    whileInView: { opacity: 1 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.6, ease: EASE, delay },
  }
}
