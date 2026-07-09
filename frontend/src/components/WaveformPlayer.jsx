import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { PlayIcon, PauseIcon } from './Icons'

/** Custom read-aloud player: a small equalizer-style waveform (Framer Motion
 * animated bars) instead of the browser's default <audio> controls. */
export default function WaveformPlayer({ audioBase64 }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  const bars = useMemo(
    () =>
      Array.from({ length: 22 }, () => ({
        delay: Math.random() * 0.8,
        duration: 0.7 + Math.random() * 0.6,
      })),
    []
  )

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    if (!audio.src) audio.src = `data:audio/wav;base64,${audioBase64}`
    audio.play()
    setPlaying(true)
  }

  return (
    <div className={`waveform-player ${playing ? 'playing' : ''}`}>
      <button type="button" className="play-btn" aria-label={playing ? 'Pause' : 'Play answer aloud'} onClick={toggle}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="waveform">
        {bars.map((bar, i) => (
          <motion.span
            key={i}
            animate={playing ? { height: [4, 16, 4] } : { height: 4 }}
            transition={playing ? { duration: bar.duration, delay: bar.delay, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          />
        ))}
      </div>
      <audio ref={audioRef} hidden onEnded={() => setPlaying(false)} />
    </div>
  )
}
