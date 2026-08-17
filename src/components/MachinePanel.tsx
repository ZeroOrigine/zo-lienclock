'use client';

import { useEffect, useRef, useState } from 'react';

interface Inflight {
  name: string; status: string; station: number; halted: boolean;
  born: string; since?: string; cost: number; thought: string | null; thoughtBy: string | null;
  launchedAt?: string | null;
}
export interface Birthline {
  ok: boolean;
  inflight: Inflight | null;
  lastBirth?: { name: string; created_at: string } | null;
  nextCycleAt?: string | null;
}

function elapsed(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function elapsedBetween(fromISO: string, toISO: string): string {
  const s = Math.max(0, Math.floor((new Date(toISO).getTime() - new Date(fromISO).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function countdown(iso: string): string | null {
  const s = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  if (!isFinite(s) || s <= 0) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m ${s % 60}s`;
}

export function useBirthline(): Birthline | null {
  const [d, setD] = useState<Birthline | null>(null);
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/birthline', { cache: 'no-store' });
        const j = (await r.json()) as Birthline;
        if (j?.ok) setD(j);
      } catch { /* keep last known. Never invent activity */ }
    };
    load();
    const t = setInterval(load, 25000);
    return () => clearInterval(t);
  }, []);
  return d;
}

// ── #196 THE BIRTH WINDOW: the 3-state hero. building = the live thought
// stream below, untouched. refused / counting = the five-row board, every
// number READ from the pipeline's /window/status via /api/window, never
// simulated. An unreadable condition renders amber and counts as red.
interface WindowCondition {
  name: string; value: unknown; threshold: unknown; pass: boolean; unreadable: boolean;
}
interface WindowStatus {
  state: 'building' | 'refused' | 'counting';
  next_window_at: string | null;
  enabled: boolean;
  conditions: WindowCondition[];
  last_window: { verdict?: string; reason_text?: string | null } | null;
  stats: { births?: number; windows_refused?: number; cost_per_birth_30d?: number; humans_served_signals?: number };
  unreachable?: boolean;
}

export function useWindowStatus(): WindowStatus | null {
  const [w, setW] = useState<WindowStatus | null>(null);
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/window', { cache: 'no-store' });
        setW((await r.json()) as WindowStatus);
      } catch { /* keep last known; the board shows UNREADABLE, never invents */ }
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);
  return w;
}

const CONDITION_LABELS: Record<string, string> = {
  treasury: 'Treasury can afford a birth',
  gates: 'Every continuous gate is green',
  line_clear: 'The line is clear',
  idea: 'An idea cleared the bar',
  pulse: 'The last birth served a human',
};

function condValueText(c: WindowCondition): string {
  if (c.unreadable) return 'UNREADABLE';
  if (c.name === 'treasury' && c.value && typeof c.value === 'object') {
    const v = c.value as { today?: number; est_birth?: number };
    const t = c.threshold as { daily?: number } | null;
    return `$${v.today?.toFixed(0)} spent + ~$${v.est_birth?.toFixed(0)} of $${t?.daily?.toFixed(0)}`;
  }
  if (c.name === 'gates') return Array.isArray(c.value) && c.value.length ? `${c.value.length} red` : 'all green';
  if (c.name === 'line_clear') return Array.isArray(c.value) && c.value.length ? String(c.value[0]) : 'clear';
  if (c.name === 'idea' && c.value && typeof c.value === 'object') {
    const v = c.value as { name?: string; research_score?: number };
    return `${v.name} at ${v.research_score}`;
  }
  if (c.name === 'idea') return 'backlog empty';
  if (c.name === 'pulse') return `${String(c.value)} of ${String(c.threshold)} needed`;
  return String(c.value ?? '·');
}

function WindowBoard({ w }: { w: WindowStatus }) {
  return (
    <div style={{ display: 'grid', gap: 6, margin: '10px 0' }}>
      {w.conditions.map((c) => (
        <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span
            style={{
              width: 8, height: 8, borderRadius: 99, flexShrink: 0,
              background: c.unreadable ? '#f5a524' : c.pass ? '#14a06b' : '#e5484d',
            }}
          />
          <span style={{ opacity: 0.85 }}>{CONDITION_LABELS[c.name] ?? c.name}</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono, monospace)', fontSize: 12, opacity: 0.7 }}>
            {c.name === 'treasury' && !c.pass && !c.unreadable ? (
              <a href="/#join" style={{ color: 'inherit', textDecoration: 'underline' }}>
                {condValueText(c)} · fund a birth
              </a>
            ) : condValueText(c)}
          </span>
        </div>
      ))}
    </div>
  );
}


/** The terminal: the machine's actual thoughts, sanitized server-side, unedited. */
export default function MachinePanel({ last }: { last?: { name: string; cost: number } | null }) {
  const d = useBirthline();
  const w = useWindowStatus();
  const [lines, setLines] = useState<{ by: string; text: string }[]>([]);
  const [, tick] = useState(0);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const t = d?.inflight?.thought;
    if (t && !seen.current.has(t)) {
      seen.current.add(t);
      setLines((old) => [...old.slice(-6), { by: d?.inflight?.thoughtBy ?? 'a Mind', text: t }]);
    }
  }, [d]);
  useEffect(() => {
    const c = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(c);
  }, []);

  const f = d?.inflight ?? null;
  // BORN: launched products stay on the board for the celebration window, but the
  // clock STOPS at the final figure — a machine must not claim labor that is over.
  const done = !!f && f.status === 'launched';
  const cd = !f && d?.nextCycleAt ? countdown(d.nextCycleAt) : null;

  return (
    <div className="machine">
      <div className="mHead">
        <span className="l"><span className={`dot${f && !f.halted ? '' : ' off'}`}></span>{f ? (done ? `${f.name} is alive` : f.halted ? `${f.name} is paused on the line` : `${f.name} is being born`) : 'The machine is thinking'}</span>
        <span className="r">unedited · live</span>
      </div>
      <div className={`stream${f ? '' : ' quiet'}`} aria-live="polite">
        {f ? (
          lines.length ? (
            lines.map((l, i) => (
              <div key={i} className="ln" style={{ animationDelay: `${i * 0.12}s` }}>
                <span className="who">{l.by}:</span> {l.text}
              </div>
            ))
          ) : (
            <div className="ln idle">
              {done
                ? `${f.name} is alive. The machine's work here is done; this panel resets when the next idea arrives.`
                : `${f.name} is on the line. The Mind at work is emitting source code, not sentences, at this exact second. The stage and the money below are real.`}
            </div>
          )
        ) : w && w.state === 'refused' && w.last_window ? (
          <div className="ln idle">
            <div style={{ fontWeight: 700, letterSpacing: '.08em', fontSize: 12, marginBottom: 6 }}>
              THE MACHINE REFUSED THIS WINDOW
            </div>
            <WindowBoard w={w} />
            <div style={{ fontSize: 12, opacity: 0.8, fontStyle: 'italic' }}>
              {w.last_window.reason_text}
            </div>
          </div>
        ) : w ? (
          <div className="ln idle">
            <div style={{ fontWeight: 700, letterSpacing: '.08em', fontSize: 12, marginBottom: 6 }}>
              {w.next_window_at && countdown(w.next_window_at)
                ? <>NEXT BIRTH WINDOW IN <span className="who">{countdown(w.next_window_at)}</span></>
                : 'THE BIRTH WINDOW'}
            </div>
            <WindowBoard w={w} />
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {w.enabled
                ? 'When the window opens, the machine births only if all five read green. It refuses in public otherwise.'
                : 'The window is armed dark. Every number above is read from the ledgers; when the founder flips the switch, the machine decides alone.'}
              {w.stats?.windows_refused ? ` Refusals so far: ${w.stats.windows_refused}, counted proudly.` : ''}
            </div>
            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 6 }}>
              Nothing on this board is decorative. Unreadable is amber, and amber is a no.
            </div>
          </div>
        ) : (
          <div className="ln idle">
            {cd ? (
              <>
                The line is idle, but the clock is set. In <span className="who">{cd}</span> the
                machine wakes itself, pulls the next problem worth solving, and a new birth
                starts here. No human presses the button.
              </>
            ) : (
              <>
                The line is idle. The factory pulls its next idea when the backlog runs low.
                {d?.lastBirth ? ` Last birth: ${d.lastBirth.name}.` : ''} When a Mind starts
                thinking, its actual thoughts stream here, unedited.
              </>
            )}
          </div>
        )}
      </div>
      <div className="mFoot">
        {f ? (
          <>
            <div><div className="k">{done ? 'Born in' : f.halted ? 'Paused at' : 'On the line'}</div><div className="v time">{done ? elapsedBetween(f.born, f.launchedAt ?? f.since ?? f.born) : f.halted ? (elapsedBetween(f.born, f.since ?? f.born) === '0s' ? '\u00b7' : elapsedBetween(f.born, f.since ?? f.born)) : elapsed(f.born)}</div></div>
            <div><div className="k">{done ? 'It cost' : 'Compute spent'}</div><div className="v money">${f.cost.toFixed(2)}</div></div>
            <div><div className="k">Humans involved</div><div className="v">0</div></div>
          </>
        ) : (
          <>
            <div><div className="k">Last birth</div><div className="v time">{last?.name ?? d?.lastBirth?.name ?? '·'}</div></div>
            <div><div className="k">It cost</div><div className="v money">{last ? `$${last.cost.toFixed(2)}` : '·'}</div></div>
            {cd ? (
              <div><div className="k">Next birth begins in</div><div className="v time">{cd}</div></div>
            ) : (
              <div><div className="k">Humans involved</div><div className="v">0</div></div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Compact one-line machine status for small screens. Same hook, no new fetches. */
export function LineChip() {
  const d = useBirthline();
  const f = d?.inflight ?? null;
  return (
    <div className="linechip">
      <span className={`dot${f && !f.halted ? '' : ' off'}`}></span>
      {f
        ? `line: building ${f.name} · $${f.cost.toFixed(2)}`
        : `line idle${d?.lastBirth ? ` · last birth ${d.lastBirth.name}` : ''}`}
    </div>
  );
}

const STATIONS = ['Research', 'Evaluation', 'Ethics', 'Builder', 'QA', 'Launch'];

/** The birth rail. Where the current product physically is on the line. */
export function BirthRail() {
  const d = useBirthline();
  const f = d?.inflight ?? null;
  return (
    <div className="rail">
      <div className="stations">
        {STATIONS.map((s, i) => (
          <div key={s} className={`st${f && i < f.station ? ' done' : ''}${f && i === f.station ? (f.halted ? ' halt' : ' here') : ''}`}>
            <div className="node"></div>
            <label>{s}</label>
          </div>
        ))}
      </div>
      <div className="railcap">
        {f ? (
          f.halted ? (
            <><b>{f.name}</b> <span>is halted at {STATIONS[f.station] ?? 'the line'}. Status {f.status}. Shown, not hidden.</span></>
          ) : f.status === 'launched' ? (
            <><b>{f.name}</b> <span>is alive. The line resets when the next idea arrives.</span></>
          ) : (
            <><b>{f.name}</b> <span>is being born.</span></>
          )
        ) : (
          <span>The line is idle{d?.lastBirth ? <>. Last birth: <b>{d.lastBirth.name}</b></> : ''}. The next idea starts here.</span>
        )}
      </div>
    </div>
  );
}
