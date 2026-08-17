// Server-rendered, data-drawn genome flow. No stock art anywhere on this site:
// this SVG is drawn from the live gene registry at request time, so the picture
// changes on its own when the next product is born. Fail-soft: the section that
// renders it simply omits it when data is null.

export interface GenomeFlowContributor {
  name: string;
  status: string; // 'live' | 'dropped' | 'founding' | anything else
  genes: number;
}

export default function GenomeFlow({
  contributors,
  total,
  inheritances,
  pool,
}: {
  contributors: GenomeFlowContributor[];
  total: number;
  inheritances: number;
  pool: number;
}) {
  const W = 940;
  const H = 330;
  const nodes = [
    { name: 'founding pool', status: 'founding', genes: pool },
    ...contributors,
  ];
  const n = nodes.length;
  const left = 70;
  const right = W - 70;
  const step = n > 1 ? (right - left) / (n - 1) : 0;
  const yNode = 78;
  const barX1 = 190;
  const barX2 = W - 190;
  const barY = 218;
  const barH = 40;
  const barCx = (barX1 + barX2) / 2;

  const color = (s: string) =>
    s === 'live' ? '#3ddc97' : s === 'founding' ? '#f5a524' : s === 'dropped' ? '#e05260' : '#8b949e';

  return (
    <div style={{ overflowX: 'auto', marginTop: 34 }} aria-label="The gene flow: every product feeds the library, the library feeds every next birth">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ minWidth: 760, width: '100%', display: 'block' }}
        role="img"
      >
        <title>
          {`${nodes.length} contributors flow into a library of ${total} genes; every next birth inherits all of it.`}
        </title>

        {/* flow paths: each contributor bends into the library */}
        {nodes.map((c, i) => {
          const x = left + i * step;
          const r = 5 + Math.min(11, Math.sqrt(c.genes || 0) * 2.2);
          const sw = 1 + Math.min(3, (c.genes || 0) * 0.12);
          return (
            <g key={c.name}>
              <path
                d={`M ${x} ${yNode + r + 2} C ${x} ${yNode + 70}, ${barCx + (x - barCx) * 0.25} ${barY - 46}, ${barCx + (x - barCx) * 0.22} ${barY - 2}`}
                fill="none"
                stroke={color(c.status)}
                strokeOpacity="0.34"
                strokeWidth={sw}
              />
              <circle cx={x} cy={yNode} r={r} fill="none" stroke={color(c.status)} strokeWidth="1.6" />
              <circle cx={x} cy={yNode} r={Math.max(1.6, r - 4)} fill={color(c.status)} fillOpacity="0.55" />
              <text
                x={x}
                y={i % 2 === 0 ? yNode - r - 22 : yNode - r - 10}
                textAnchor="middle"
                fill="#c9d2cc"
                fontFamily="'JetBrains Mono',monospace"
                fontSize="10.5"
              >
                {c.name}
              </text>
              <text
                x={x}
                y={i % 2 === 0 ? yNode - r - 10 : yNode + r + 14}
                textAnchor="middle"
                fill="#7d857f"
                fontFamily="'JetBrains Mono',monospace"
                fontSize="9.5"
              >
                {c.genes} {c.genes === 1 ? 'gene' : 'genes'}
              </text>
            </g>
          );
        })}

        {/* the library */}
        <rect
          x={barX1}
          y={barY}
          width={barX2 - barX1}
          height={barH}
          rx="9"
          fill="rgba(61,220,151,0.06)"
          stroke="#3ddc97"
          strokeWidth="1.4"
        />
        <text
          x={barCx}
          y={barY + 25}
          textAnchor="middle"
          fill="#3ddc97"
          fontFamily="'JetBrains Mono',monospace"
          fontSize="13"
          letterSpacing="2"
        >
          THE GENE LIBRARY · {total} PROVEN GENES
        </text>

        {/* forward inheritance */}
        <path
          d={`M ${barCx} ${barY + barH} L ${barCx} ${barY + barH + 22}`}
          stroke="#3ddc97"
          strokeOpacity="0.6"
          strokeWidth="1.4"
        />
        <path
          d={`M ${barCx - 5} ${barY + barH + 16} L ${barCx} ${barY + barH + 23} L ${barCx + 5} ${barY + barH + 16}`}
          fill="none"
          stroke="#3ddc97"
          strokeOpacity="0.6"
          strokeWidth="1.4"
        />
        <text
          x={barCx}
          y={barY + barH + 42}
          textAnchor="middle"
          fill="#9aa39d"
          fontFamily="'JetBrains Mono',monospace"
          fontSize="11"
        >
          every next birth inherits all of it · {inheritances} inheritances recorded so far
        </text>
      </svg>
    </div>
  );
}
