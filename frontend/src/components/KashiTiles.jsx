// A field of eight-pointed kashi stars, the pattern painted on Multani blue tiles.
// With `animate`, the strokes draw themselves in as a wave from the top-left corner.

function starPath(cx, cy, r) {
  // Two overlapping squares give the eight-pointed khatam star.
  const inner = (r * Math.SQRT1_2) / Math.cos(Math.PI / 8)
  const points = []
  for (let i = 0; i < 16; i += 1) {
    const radius = i % 2 === 0 ? r : inner
    const angle = (Math.PI / 8) * i - Math.PI / 2
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`)
  }
  return `M${points.join('L')}Z`
}

function diamondPath(cx, cy, r) {
  return `M${cx},${cy - r}L${cx + r},${cy}L${cx},${cy + r}L${cx - r},${cy}Z`
}

export function KashiTiles({
  cols = 6,
  rows = 8,
  size = 72,
  animate = false,
  className = '',
  starClass = 'stroke-white/25',
  accentClass = 'stroke-kashi-300',
  diamondClass = 'stroke-white/15',
}) {
  const shapes = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cx = col * size + size / 2
      const cy = row * size + size / 2
      // A loose diagonal of turquoise stars, like a glaze highlight.
      const accent = (row + col * 2) % 7 === 0
      const delay = `${(row + col) * 70}ms`
      shapes.push(
        <path
          key={`s${row}-${col}`}
          d={starPath(cx, cy, size * 0.36)}
          pathLength="1"
          className={`${accent ? accentClass : starClass} ${animate ? 'tile-draw' : ''}`}
          style={animate ? { animationDelay: delay } : undefined}
        />,
      )
      if (row < rows - 1 && col < cols - 1) {
        shapes.push(
          <path
            key={`d${row}-${col}`}
            d={diamondPath(cx + size / 2, cy + size / 2, size * 0.14)}
            pathLength="1"
            className={`${diamondClass} ${animate ? 'tile-draw' : ''}`}
            style={animate ? { animationDelay: `${(row + col + 1) * 70 + 200}ms` } : undefined}
          />,
        )
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${cols * size} ${rows * size}`}
      className={className}
      fill="none"
      strokeWidth="1.25"
      strokeLinejoin="round"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      {shapes}
    </svg>
  )
}
