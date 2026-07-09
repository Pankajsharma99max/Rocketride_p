// Small inline icon set (no icon-library dependency) -- each mirrors an icon
// from the original vanilla build so the visual language stayed identical
// while the markup moved to JSX.

const base = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' }

export const SunIcon = (p) => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" {...base} {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
  </svg>
)

export const MoonIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M20.4 14.7A8.5 8.5 0 1 1 9.3 3.6a7 7 0 0 0 11.1 11.1Z" />
  </svg>
)

export const SettingsIcon = (p) => (
  <svg viewBox="0 0 24 24" strokeWidth="1.7" {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
)

export const UploadIcon = (p) => (
  <svg viewBox="0 0 24 24" strokeWidth="1.6" {...base} {...p}>
    <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
    <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
)

export const DocIcon = (p) => (
  <svg viewBox="0 0 24 24" strokeWidth="1.6" {...base} {...p}>
    <path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v5h5" />
  </svg>
)

export const TrashIcon = (p) => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" {...base} {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
  </svg>
)

export const ExportIcon = (p) => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" {...base} {...p}>
    <path d="M12 3v12M12 15l-4-4M12 15l4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
)

export const SendIcon = (p) => (
  <svg viewBox="0 0 24 24" strokeWidth="2" {...base} {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
)

export const CopyIcon = (p) => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" {...base} {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
)

export const PlayIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M8 5v14l11-7z" />
  </svg>
)

export const PauseIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
  </svg>
)

export const ChevronIcon = (p) => (
  <svg viewBox="0 0 24 24" strokeWidth="2" {...base} {...p}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export const CloseIcon = (p) => (
  <svg viewBox="0 0 24 24" strokeWidth="2" {...base} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

export const LandmarkIcon = (p) => (
  <svg viewBox="0 0 24 24" strokeWidth="1.7" {...base} {...p}>
    <path d="M3 21h18M4 21V10M20 21V10M2 10l10-6 10 6M6 10v11M10 10v11M14 10v11M18 10v11" />
  </svg>
)

export const ChartIcon = (p) => (
  <svg viewBox="0 0 24 24" strokeWidth="1.7" {...base} {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
)

export const BookIcon = (p) => (
  <svg viewBox="0 0 24 24" strokeWidth="1.7" {...base} {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
  </svg>
)

export const SpeakerIcon = (p) => (
  <svg viewBox="0 0 24 24" strokeWidth="1.7" {...base} {...p}>
    <path d="M4 9v6h4l5 5V4L8 9H4Z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19.2 6a9 9 0 0 1 0 12" />
  </svg>
)

export const MailIcon = (p) => (
  <svg viewBox="0 0 24 24" strokeWidth="1.7" {...base} {...p}>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11Z" />
    <path d="m4 6.5 8 6.5 8-6.5" />
  </svg>
)
