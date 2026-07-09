import { motion, AnimatePresence } from 'framer-motion'
import { DocIcon } from './Icons'

const BADGE_LABELS = {
  general: 'General',
  rti_govt: 'RTI/Govt',
  finance: 'Finance',
  research: 'Research',
}

export default function Library({ documents }) {
  return (
    <section className="library">
      <h2 className="library-title">Library</h2>
      <ul className="library-list">
        {documents.length === 0 && <li className="library-empty">Nothing indexed yet</li>}
        <AnimatePresence>
          {documents.map((doc, i) => {
            const isError = doc.status !== 'indexed'
            return (
              <motion.li
                key={`${doc.filename}-${doc.indexed_at}`}
                className={`library-item ${isError ? 'error' : ''}`}
                title={doc.detail || doc.filename}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i, 6) * 0.03 }}
              >
                <DocIcon className="doc-icon" />
                <span className="doc-name">{doc.filename}</span>
                <span className={`category-badge ${doc.category || 'general'}`}>
                  {BADGE_LABELS[doc.category] || BADGE_LABELS.general}
                </span>
                <span className="doc-status" />
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </section>
  )
}
