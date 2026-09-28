/** The Build → Prove → Sign off → Ship → Learn loop, drawn for the sign-in page. */
export function LoopArt({ className }: { className?: string }) {
  const nodes = [
    { x: 240, y: 42, label: 'Build', sub: 'from a prompt or your repo' },
    { x: 395, y: 135, label: 'Prove', sub: 'with your experts’ examples' },
    { x: 335, y: 262, label: 'Sign off', sub: 'IT approves from evidence' },
    { x: 145, y: 262, label: 'Ship', sub: 'on your cloud or ours' },
    { x: 85, y: 135, label: 'Learn', sub: 'flags become tests' },
  ];
  const arrows = [
    'M 318 44 Q 385 50 395 104',
    'M 398 164 Q 402 215 374 234',
    'M 257 262 L 228 262',
    'M 100 236 Q 80 206 84 168',
    'M 88 106 Q 94 50 158 42',
  ];
  return (
    <svg viewBox="0 0 480 310" className={className} role="img" aria-label="The loop: Build, Prove, Sign off, Ship, Learn, then back to Build">
      <defs>
        <marker id="loop-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#8FA6F0" />
        </marker>
      </defs>
      <ellipse cx="240" cy="152" rx="168" ry="108" fill="none" stroke="#3A3834" strokeWidth="1.5" strokeDasharray="4 6" />
      {arrows.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#8FA6F0" strokeWidth="1.8" markerEnd="url(#loop-arrow)" />
      ))}
      {nodes.map((n, i) => (
        <g key={n.label}>
          <rect x={n.x - 75} y={n.y - 24} width="150" height="48" rx="14" style={{ fill: i === 1 ? 'rgb(var(--accent))' : '#2A2926', stroke: i === 1 ? 'rgb(var(--accent))' : '#4A4742' }} />
          <text x={n.x} y={n.y - 3} textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="600" fontFamily="IBM Plex Sans, sans-serif">
            {n.label}
          </text>
          <text x={n.x} y={n.y + 13} textAnchor="middle" fill={i === 1 ? '#DCE3FA' : '#9C988F'} fontSize="10.5" fontFamily="IBM Plex Sans, sans-serif">
            {n.sub}
          </text>
        </g>
      ))}
      <text x="240" y="150" textAnchor="middle" fill="#E9E6DF" fontSize="13.5" fontWeight="600" fontFamily="IBM Plex Sans, sans-serif">
        One loop, one tool
      </text>
      <text x="240" y="169" textAnchor="middle" fill="#9C988F" fontSize="11" fontFamily="IBM Plex Sans, sans-serif">
        and your code stays yours
      </text>
    </svg>
  );
}
