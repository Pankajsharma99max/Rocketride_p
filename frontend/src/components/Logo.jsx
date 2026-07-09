import { motion } from 'framer-motion'

/** The Docket mark: a document with a folded corner and a checkmark, on a
 * rounded accent-blue badge. Reused as the favicon (public/favicon.svg) and
 * here for the in-app top bar, so the brand identity is exactly one shape. */
export default function Logo({ size = 34, animate = true }) {
  const Wrapper = animate ? motion.svg : 'svg'
  const motionProps = animate
    ? {
        initial: { scale: 0.6, rotate: -8, opacity: 0 },
        animate: { scale: 1, rotate: 0, opacity: 1 },
        transition: { type: 'spring', stiffness: 260, damping: 18 },
      }
    : {}

  return (
    <Wrapper
      width={size}
      height={size}
      viewBox="0 0 34 34"
      xmlns="http://www.w3.org/2000/svg"
      {...motionProps}
    >
      <rect width="34" height="34" rx="9" fill="var(--accent)" />
      <path d="M11 8a2 2 0 0 1 2-2h6l5 5v15a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V8Z" fill="#fff" />
      <path
        d="M19 6v4.2a0.8 0.8 0 0 0 0.8 0.8H24"
        stroke="var(--accent)"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 18.5l2.4 2.4L20.5 15.5"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Wrapper>
  )
}
