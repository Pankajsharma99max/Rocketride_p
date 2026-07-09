import { useState } from 'react'
import { motion } from 'framer-motion'
import { DocIcon, ChevronIcon } from './Icons'

export default function SourceCard({ source }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="source-card">
      <button type="button" className="source-card-header" onClick={() => setOpen((o) => !o)}>
        <DocIcon className="source-icon" />
        <span className="source-name">{source.document || 'Source passage'}</span>
        <motion.span className="chevron" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronIcon />
        </motion.span>
      </button>
      <motion.div
        className="source-body"
        initial={false}
        animate={{ height: open ? 'auto' : 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="source-body-inner">{source.snippet}</div>
      </motion.div>
    </div>
  )
}
