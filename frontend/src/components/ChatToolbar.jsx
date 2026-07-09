import { motion } from 'framer-motion'

export default function ChatToolbar({ categories, quickActions, focus, onFocusChange, onQuickAction, disabled }) {
  return (
    <div className="chat-toolbar">
      <div className="field-group focus-select">
        <label htmlFor="focus-category">Answering as</label>
        <select id="focus-category" value={focus} onChange={(e) => onFocusChange(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="quick-actions">
        {quickActions.map((action) => (
          <motion.button
            key={action.id}
            type="button"
            className="quick-action-btn"
            disabled={disabled}
            onClick={() => onQuickAction(action)}
            whileHover={{ scale: disabled ? 1 : 1.04 }}
            whileTap={{ scale: disabled ? 1 : 0.96 }}
          >
            {action.label}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
