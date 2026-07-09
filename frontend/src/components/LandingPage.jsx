import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Logo from './Logo'
import { SplineScene } from './SplineScene'
import { Spotlight } from './Spotlight'
import FeatureGrid from './FeatureGrid'
import ContactSection from './ContactSection'
import { EASE, reveal } from '../motion'

function useScrolled(threshold = 48) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > threshold)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

export default function LandingPage({ onEnterApp, showToast }) {
  const scrolled = useScrolled()

  return (
    <div className="landing">
      <header className={`landing-nav ${scrolled ? 'is-scrolled' : 'is-transparent'}`}>
        <div className="landing-nav-inner">
          <div className="brand">
            <Logo size={30} />
            <span className="brand-name">Docket</span>
          </div>
          <div className="topbar-actions">
            <motion.button
              className="save-btn"
              onClick={onEnterApp}
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              Open Docket
            </motion.button>
          </div>
        </div>
      </header>

      <section className="hero-dark">
        <Spotlight className="hero-dark-spotlight" fill="white" />

        <div className="hero-dark-inner">
          <motion.div
            className="hero-dark-visual"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
          >
            <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="spline-canvas" />
          </motion.div>

          <div className="hero-dark-copy">
            <motion.span
              className="landing-eyebrow"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              RTI · Government · Finance · Research
            </motion.span>

            <motion.h1
              className="hero-dark-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
            >
              Ask your documents anything
            </motion.h1>

            <motion.p
              className="hero-dark-sub"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
            >
              Upload an RTI reply, government form, financial statement, or research paper. Docket answers in plain
              language, cites the exact passage, and can read it aloud.
            </motion.p>

            <motion.div
              className="landing-hero-cta-row"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.28 }}
            >
              <motion.button
                className="save-btn landing-cta"
                onClick={onEnterApp}
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                Open Docket — it's free
              </motion.button>
            </motion.div>
          </div>
        </div>

        <div className="hero-dark-fade" />
      </section>

      <div className="landing-glow" aria-hidden="true" />

      <FeatureGrid />
      <ContactSection showToast={showToast} />

      <footer className="landing-footer">
        <motion.div className="brand" {...reveal(0)}>
          <Logo size={22} animate={false} />
          <span>Docket</span>
        </motion.div>
        <motion.span className="landing-footer-sub" {...reveal(0.05)}>
          Built on RocketRide — open-source AI pipeline engine
        </motion.span>
      </footer>
    </div>
  )
}
