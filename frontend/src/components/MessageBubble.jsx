import { motion } from 'framer-motion'
import { CopyIcon } from './Icons'
import SourceCard from './SourceCard'
import WaveformPlayer from './WaveformPlayer'

const rowMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: 'easeOut' },
}

export function UserMessage({ text }) {
  return (
    <motion.div className="msg-row user" {...rowMotion}>
      <div className="bubble">{text}</div>
    </motion.div>
  )
}

export function ErrorMessage({ text }) {
  return (
    <motion.div className="msg-row assistant error" {...rowMotion}>
      <div className="bubble">{text}</div>
    </motion.div>
  )
}

export function TypingIndicator() {
  return (
    <motion.div className="msg-row assistant" {...rowMotion}>
      <div className="bubble-group">
        <div className="bubble">
          <span className="typing-dots">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              />
            ))}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export function AssistantMessage({ answer, sources, audioBase64, onCopy }) {
  return (
    <motion.div className="msg-row assistant" {...rowMotion}>
      <div className="bubble-group">
        <div className="bubble">{answer}</div>

        {sources && sources.length > 0 && (
          <div className="sources">
            {sources.map((src, i) => (
              <SourceCard key={i} source={src} />
            ))}
          </div>
        )}

        <div className="msg-actions">
          <CopyButton text={answer} onCopy={onCopy} />
          {audioBase64 && <WaveformPlayer audioBase64={audioBase64} />}
        </div>
      </div>
    </motion.div>
  )
}

function CopyButton({ text }) {
  return (
    <button
      type="button"
      className="copy-btn"
      onClick={async (e) => {
        const label = e.currentTarget.querySelector('span')
        try {
          await navigator.clipboard.writeText(text)
          if (label) {
            label.textContent = 'Copied'
            setTimeout(() => {
              if (label) label.textContent = 'Copy'
            }, 1500)
          }
        } catch {
          // Clipboard access can be denied by the browser; the button simply
          // stays "Copy" -- no destructive fallback needed here.
        }
      }}
    >
      <CopyIcon className="icon" />
      <span>Copy</span>
    </button>
  )
}
