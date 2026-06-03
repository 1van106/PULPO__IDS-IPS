export function ShieldIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

export function OctopusIcon({ size = 32 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="49 62 414 414" width={size} height={size} overflow="visible">
      <defs>
        <filter id="oi-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.6" result="b1"/>
          <feGaussianBlur stdDeviation="10" result="b2"/>
          <feMerge><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="oi-sg" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="s1"/>
          <feGaussianBlur stdDeviation="8" result="s2"/>
          <feMerge><feMergeNode in="s2"/><feMergeNode in="s1"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="oi-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3"/>
        </filter>
        <radialGradient id="oi-bg" cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#0a2230"/>
          <stop offset="100%" stopColor="#0d1117"/>
        </radialGradient>
        <radialGradient id="oi-sf" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#0d3a4c" stopOpacity="0.85"/>
          <stop offset="55%" stopColor="#0a2734" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#08151c" stopOpacity="0.92"/>
        </radialGradient>
        <radialGradient id="oi-hf" cx="50%" cy="36%" r="66%">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.02"/>
        </radialGradient>
        <path id="oi-hp" d="M198,234 C172,200 176,150 212,130 C234,118 278,118 300,130 C336,150 340,200 314,234 C298,252 214,252 198,234 Z"/>
        <clipPath id="oi-hc"><use href="#oi-hp"/></clipPath>
        <path id="oi-sp" d="M118,86 L394,86 Q428,86 428,120 L428,250 C428,338 360,410 256,452 C152,410 84,338 84,250 L84,120 Q84,86 118,86 Z"/>
        <pattern id="oi-mesh" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M10,0 L20,10 L10,20 L0,10 Z" fill="none" stroke="#00d4ff" strokeWidth="0.8" strokeOpacity="0.5"/>
        </pattern>
      </defs>
      {/* Shield */}
      <use href="#oi-sp" fill="url(#oi-sf)"/>
      <g fill="none" stroke="#00d4ff" strokeLinejoin="round" filter="url(#oi-sg)">
        <use href="#oi-sp" strokeWidth="6"/>
        <use href="#oi-sp" strokeWidth="2.4" strokeOpacity="0.4" transform="translate(256,250) scale(0.93) translate(-256,-250)"/>
      </g>
      {/* Octopus */}
      <g transform="translate(0,-4) translate(256,261) scale(0.66) translate(-256,-261)">
        <g fill="none" stroke="#00d4ff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" filter="url(#oi-glow)">
          <path d="M246,248 C240,310 236,360 224,418"/>
          <path d="M228,246 C206,300 196,356 168,398"/>
          <path d="M212,240 C176,278 150,330 120,362"/>
          <path d="M198,232 C156,256 110,282 84,312"/>
          <path d="M266,248 C272,310 276,360 288,418"/>
          <path d="M284,246 C306,300 316,356 344,398"/>
          <path d="M300,240 C336,278 362,330 392,362"/>
          <path d="M314,232 C356,256 402,282 428,312"/>
          <use href="#oi-hp" fill="url(#oi-hf)"/>
          <polygon points="219,182 233,182 240,194 233,206 219,206 212,194"/>
          <polygon points="279,182 293,182 300,194 293,206 279,206 272,194"/>
        </g>
        <g clipPath="url(#oi-hc)" opacity="0.16" filter="url(#oi-soft)">
          <rect x="180" y="120" width="160" height="135" fill="url(#oi-mesh)"/>
        </g>
        <g fill="#36c4ee" filter="url(#oi-soft)">
          <circle cx="237" cy="318" r="3.4"/><circle cx="230" cy="375" r="2.6"/>
          <circle cx="204" cy="318" r="3.4"/><circle cx="185" cy="368" r="2.6"/>
          <circle cx="168" cy="296" r="3.4"/><circle cx="140" cy="333" r="2.6"/>
          <circle cx="153" cy="263" r="3.4"/><circle cx="111" cy="291" r="2.6"/>
          <circle cx="275" cy="318" r="3.4"/><circle cx="282" cy="375" r="2.6"/>
          <circle cx="308" cy="318" r="3.4"/><circle cx="327" cy="368" r="2.6"/>
          <circle cx="344" cy="296" r="3.4"/><circle cx="372" cy="333" r="2.6"/>
          <circle cx="359" cy="263" r="3.4"/><circle cx="401" cy="291" r="2.6"/>
        </g>
        <g fill="#7fe9ff" filter="url(#oi-glow)">
          <circle cx="224" cy="418" r="6"/><circle cx="168" cy="398" r="6"/>
          <circle cx="120" cy="362" r="6"/><circle cx="84" cy="312" r="6"/>
          <circle cx="288" cy="418" r="6"/><circle cx="344" cy="398" r="6"/>
          <circle cx="392" cy="362" r="6"/><circle cx="428" cy="312" r="6"/>
          <circle cx="226" cy="194" r="4"/><circle cx="286" cy="194" r="4"/>
        </g>
      </g>
    </svg>
  )
}

export function SwapIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h13l-3-3" /><path d="M21 17H8l3 3" />
    </svg>
  )
}

export function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h13" /><path d="M13 6l6 6-6 6" />
    </svg>
  )
}
