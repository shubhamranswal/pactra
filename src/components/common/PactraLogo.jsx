export default function PactraLogo({ className = "h-8 w-auto", showBadge = true, showText = true }) {
  return (
    <div className="flex items-center gap-2.5 group">
      <svg
        className={className}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="PACTRA Logo"
      >
        <defs>
          <linearGradient id="pactraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill="#0E1015" />
        <rect width="98" height="98" x="1" y="1" rx="23" fill="none" stroke="#262A36" strokeWidth="1.5" />
        {/* Geometric intersecting autonomous trust node / shield glyph */}
        <path
          d="M50 20 L76 34 L76 66 L50 80 L24 66 L24 34 Z"
          fill="none"
          stroke="url(#pactraGrad)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="50" r="10" fill="#0E1015" stroke="#A78BFA" strokeWidth="2.5" />
        <line x1="50" y1="20" x2="50" y2="40" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="60" x2="50" y2="80" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
        <circle cx="50" cy="50" r="4" fill="#38BDF8" />
      </svg>
      {showText && (
        <span className="font-display text-xl font-bold tracking-tight text-white transition-colors group-hover:text-accent-cyan">
          PACTRA
        </span>
      )}
      {showBadge && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase bg-[#181A20] border border-[#38BDF8]/30 text-[#38BDF8]">
          TESTNET
        </span>
      )}
    </div>
  )
}
