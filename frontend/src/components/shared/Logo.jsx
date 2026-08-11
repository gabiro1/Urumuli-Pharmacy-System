export function Logo({ className = 'h-8 w-8', showText = true }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <rect width="40" height="40" rx="10" className="fill-foreground" />
        <circle
          cx="20" cy="20" r="7"
          className="fill-background"
        />
        <path
          d="M20 17V23M17 20H23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-foreground"
        />
        <circle cx="20" cy="20" r="2" className="fill-foreground" />
      </svg>
      {showText && (
        <span className="font-semibold tracking-tight text-foreground text-lg">
          Urumuli
        </span>
      )}
    </div>
  )
}

export function Logomark({ className = 'h-7 w-7' }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="40" height="40" rx="10" className="fill-foreground" />
      <circle cx="20" cy="20" r="7" className="fill-background" />
      <path
        d="M20 17V23M17 20H23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-foreground"
      />
      <circle cx="20" cy="20" r="2" className="fill-foreground" />
    </svg>
  )
}
