import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadIcon } from './Icons'
import { uploadDocument } from '../api'

export default function UploadZone({ categories, onUploaded, showToast }) {
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [category, setCategory] = useState('general')
  const [progress, setProgress] = useState(null) // null = idle, {pct, label}

  async function handleFile(file) {
    if (!file) return
    setProgress({ pct: 0, label: `Uploading ${file.name}…` })

    const { ok, data } = await uploadDocument(file, category, (pct) => setProgress({ pct, label: `Uploading ${file.name}…` }))

    if (ok) {
      setProgress({ pct: 100, label: 'Indexed' })
      showToast(`Indexed "${data.filename}"`, 'success')
    } else {
      setProgress({ pct: 100, label: 'Failed' })
      showToast(data.detail || data.error || 'Upload failed', 'error')
    }
    onUploaded()
    setTimeout(() => setProgress(null), 1400)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div>
      <motion.section
        className={`upload-zone ${dragOver ? 'dragover' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFile(e.dataTransfer.files[0])
        }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.png,.jpg,.jpeg"
          hidden
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <div className="upload-zone-inner">
          <UploadIcon className="upload-icon" />
          <p className="upload-title">Drop a document</p>
          <p className="upload-hint">
            or{' '}
            <button
              type="button"
              className="link-btn"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
            >
              browse files
            </button>
          </p>
        </div>

        <AnimatePresence>
          {progress && (
            <motion.div
              className="upload-progress"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="progress-track">
                <motion.div
                  className="progress-fill"
                  animate={{ width: `${progress.pct}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
              <span className="progress-label">{progress.label}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <div className="field-group category-select" style={{ marginTop: 12 }}>
        <label htmlFor="upload-category">Document type</label>
        <select id="upload-category" value={category} onChange={(e) => setCategory(e.target.value)} onClick={(e) => e.stopPropagation()}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
