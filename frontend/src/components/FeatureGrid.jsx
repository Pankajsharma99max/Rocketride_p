import { motion } from 'framer-motion'
import { LandmarkIcon, ChartIcon, BookIcon, SpeakerIcon } from './Icons'
import { EASE, reveal } from '../motion'

const FEATURES = [
  {
    icon: LandmarkIcon,
    tone: 'rti_govt',
    title: 'RTI & Government',
    text: 'Plain-language answers to dense paperwork, with the exact section or clause cited.',
  },
  {
    icon: ChartIcon,
    tone: 'finance',
    title: 'Financial documents',
    text: 'Exact figures, currency, and dates quoted from the source — never rounded or guessed.',
  },
  {
    icon: BookIcon,
    tone: 'research',
    title: 'Research & academic',
    text: 'Answers reference the specific finding or methodology, in a precise, academic tone.',
  },
  {
    icon: SpeakerIcon,
    tone: 'general',
    title: 'Listen to any answer',
    text: 'Every answer can be read aloud, in English or Hindi, for low-literacy or low-vision users.',
  },
]

export default function FeatureGrid() {
  return (
    <section className="landing-section">
      <motion.h2 className="landing-section-title" {...reveal(0)}>
        One assistant, every kind of document
      </motion.h2>
      <motion.p className="landing-section-sub" {...reveal(0.06)}>
        The same conversation, tuned automatically to the kind of document you're asking about.
      </motion.p>

      <div className="feature-grid">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            className={`feature-card tone-${f.tone}`}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
            whileHover={{ y: -6 }}
          >
            <span className="feature-icon">
              <f.icon className="icon" />
            </span>
            <h3 className="feature-title">{f.title}</h3>
            <p>{f.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
