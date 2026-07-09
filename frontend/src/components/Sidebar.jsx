import { motion } from 'framer-motion'
import UploadZone from './UploadZone'
import Library from './Library'

export default function Sidebar({ categories, documents, onUploaded, showToast }) {
  return (
    <motion.aside
      className="sidebar"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
    >
      <UploadZone categories={categories} onUploaded={onUploaded} showToast={showToast} />
      <Library documents={documents} />
    </motion.aside>
  )
}
