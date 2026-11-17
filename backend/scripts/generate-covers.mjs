// สร้างภาพปก + ภาพหน้าจอ (SVG) ของเกมตัวอย่างทั้งหมด ไว้ที่ frontend/public/covers/
// รัน: node scripts/generate-covers.mjs  (สุ่มแบบกำหนด seed ได้ภาพเดิมทุกครั้ง)
// ภาพปก: /covers/<slug>.svg   ภาพหน้าจอ: /covers/<slug>-1.svg ... -4.svg
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../frontend/public/covers')
const W = 1200
const H = 675
export const SHOTS = 4

// ธีมของแต่ละเกม: scene = รูปแบบฉาก, hue = สีหลัก
const GAMES = {
  'starfall-odyssey': { scene: 'space', hue: 260 },
  'neon-drift': { scene: 'neonRoad', hue: 310 },
  'hollow-grove': { scene: 'forest', hue: 150 },
  'iron-legion': { scene: 'castle', hue: 20 },
  'pixel-harvest': { scene: 'farm', hue: 95 },
  'skyline-strikers': { scene: 'stadium', hue: 210 },
  'crimson-vow': { scene: 'castle', hue: 350 },
  tidebound: { scene: 'ocean', hue: 195 },
  'echo-station': { scene: 'blocks', hue: 180 },
  'nova-frontier': { scene: 'space', hue: 200 },
  'moonlit-bakery': { scene: 'town', hue: 35 },
  'shadow-circuit': { scene: 'city', hue: 280 },
  'kingdom-of-ash': { scene: 'castle', hue: 15 },
  'turbo-tanks': { scene: 'desert', hue: 40 },
  'last-light-protocol': { scene: 'city', hue: 0 },
  'garden-spirits': { scene: 'forest', hue: 120 },
  'fist-of-the-tiger': { scene: 'dojo', hue: 10 },
  'deep-sea-colony': { scene: 'underwater', hue: 205 },
  wildfang: { scene: 'mountains', hue: 25 },
  'paper-knights': { scene: 'castle', hue: 45 },
  'rally-kings': { scene: 'neonRoad', hue: 30 },
  'arcane-academy': { scene: 'tower', hue: 270 },
  'block-breakers': { scene: 'blocks', hue: 330 },
  'glacier-run': { scene: 'snow', hue: 190 },
}

// ---------- utils ----------
function rng(seed) {
  let s = 0
  for (const c of seed) s = (Math.imul(s ^ c.charCodeAt(0), 2654435761) + 1) >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hsl = (h, s, l, a = 1) => `hsla(${((h % 360) + 360) % 360} ${s}% ${l}% / ${a})`
const f = (n) => Math.round(n * 10) / 10

function ridge(r, baseY, amp, steps = 14) {
  let d = `M0 ${H} L0 ${f(baseY)}`
  for (let i = 1; i <= steps; i++) d += ` L${f((W / steps) * i)} ${f(baseY - r() * amp)}`
  return d + ` L${W} ${H} Z`
}
function stars(r, n, maxY = H) {
  let s = ''
  for (let i = 0; i < n; i++) s += `<circle cx="${f(r() * W)}" cy="${f(r() * maxY)}" r="${f(r() * 1.8 + 0.4)}" fill="#fff" opacity="${f(r() * 0.7 + 0.3)}"/>`
  return s
}
const sky = (id, top, bottom) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>`
const glow = (id, cx, cy, rad, color) =>
  `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad)}" fill="url(#${id})"/>`

// ---------- scenes ----------
const scenes = {
  space(r, h) {
    const px = 200 + r() * 800, py = 150 + r() * 250, pr = 90 + r() * 110
    let s = sky('bg', hsl(h, 60, 8), hsl(h + 40, 55, 18)) + stars(r, 220)
    s += glow('neb', r() * W, r() * H, 420, hsl(h + 60, 80, 45, 0.35))
    s += `<defs><linearGradient id="pl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hsl(h + 20, 70, 60)}"/><stop offset="1" stop-color="${hsl(h - 30, 60, 18)}"/></linearGradient></defs>`
    s += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(pr)}" fill="url(#pl)"/>`
    s += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(pr * 1.7)}" ry="${f(pr * 0.35)}" fill="none" stroke="${hsl(h + 40, 70, 75, 0.6)}" stroke-width="6" transform="rotate(-15 ${f(px)} ${f(py)})"/>`
    s += `<circle cx="${f(W - px * 0.6)}" cy="${f(H - 140)}" r="${f(30 + r() * 30)}" fill="${hsl(h + 180, 40, 55)}"/>`
    const sx = 150 + r() * 900, sy = 380 + r() * 180
    s += `<g transform="translate(${f(sx)} ${f(sy)}) rotate(-20)"><path d="M0 0 L70 -14 L95 0 L70 14 Z" fill="#e8ecf5"/><path d="M20 -6 L-8 -26 L10 -4 Z M20 6 L-8 26 L10 4 Z" fill="${hsl(h, 50, 60)}"/><path d="M0 -5 L-60 0 L0 5 Z" fill="${hsl(h + 60, 100, 65, 0.8)}"/></g>`
    return s
  },
  neonRoad(r, h) {
    let s = sky('bg', hsl(h + 220, 60, 10), hsl(h, 80, 35))
    s += stars(r, 80, H * 0.45)
    s += glow('sun', W / 2, H * 0.55, 260, hsl(h + 20, 100, 60, 0.9))
    for (let i = 0; i < 7; i++) s += `<rect x="${W / 2 - 230}" y="${f(H * 0.42 + i * 14)}" width="460" height="${4 + i}" fill="${hsl(h + 220, 60, 10)}"/>`
    s += `<path d="${ridge(r, H * 0.58, 70, 22)}" fill="${hsl(h + 230, 50, 12)}"/>`
    s += `<polygon points="0,${H} ${W},${H} ${W / 2 + 30},${f(H * 0.6)} ${W / 2 - 30},${f(H * 0.6)}" fill="${hsl(h + 230, 40, 7)}"/>`
    for (let i = 0; i < 12; i++) {
      const y = H * 0.6 + Math.pow(i / 12, 2) * H * 0.4
      s += `<line x1="0" y1="${f(y)}" x2="${W}" y2="${f(y)}" stroke="${hsl(h, 100, 60, 0.5)}" stroke-width="2"/>`
    }
    for (let i = -6; i <= 6; i++) s += `<line x1="${W / 2 + i * 5}" y1="${f(H * 0.6)}" x2="${W / 2 + i * 180}" y2="${H}" stroke="${hsl(h, 100, 60, 0.5)}" stroke-width="2"/>`
    const cx = W / 2 - 80 + r() * 160
    s += `<g transform="translate(${f(cx)} ${H - 110})"><rect x="-90" y="0" width="180" height="50" rx="14" fill="${hsl(h + 180, 70, 50)}"/><rect x="-60" y="-30" width="120" height="40" rx="12" fill="${hsl(h + 180, 50, 25)}"/><rect x="-80" y="14" width="30" height="10" rx="3" fill="${hsl(0, 100, 60)}"/><rect x="50" y="14" width="30" height="10" rx="3" fill="${hsl(0, 100, 60)}"/></g>`
    return s
  },
  forest(r, h) {
    let s = sky('bg', hsl(h + 100, 40, 14), hsl(h + 60, 45, 32))
    s += stars(r, 60, H * 0.4)
    const mx = 250 + r() * 700
    s += glow('moon', mx, 140, 120, hsl(60, 80, 85, 0.6)) + `<circle cx="${f(mx)}" cy="140" r="44" fill="${hsl(55, 70, 88)}"/>`
    for (let layer = 0; layer < 3; layer++) {
      const l = 22 - layer * 7, base = H * (0.55 + layer * 0.14)
      s += `<rect x="0" y="${f(base)}" width="${W}" height="${f(H - base)}" fill="${hsl(h, 35, l - 4)}"/>`
      for (let i = 0; i < 16; i++) {
        const x = r() * W, th = 140 + r() * 160 + layer * 40, tw = 40 + r() * 40
        s += `<polygon points="${f(x)},${f(base - th)} ${f(x - tw)},${f(base + 10)} ${f(x + tw)},${f(base + 10)}" fill="${hsl(h, 35, l)}"/>`
      }
    }
    for (let i = 0; i < 40; i++) s += `<circle cx="${f(r() * W)}" cy="${f(H * 0.4 + r() * H * 0.55)}" r="${f(r() * 3 + 1)}" fill="${hsl(h - 70, 100, 70)}" opacity="${f(r() * 0.8 + 0.2)}"/>`
    return s
  },
  castle(r, h) {
    let s = sky('bg', hsl(h + 10, 50, 22), hsl(h + 30, 80, 55))
    s += glow('sun', 200 + r() * 800, H * 0.5, 240, hsl(h + 30, 100, 70, 0.8))
    s += `<path d="${ridge(r, H * 0.62, 90)}" fill="${hsl(h, 30, 25)}"/>`
    const cx = 300 + r() * 600, base = H * 0.72, c = hsl(h, 30, 10)
    s += `<rect x="${f(cx - 200)}" y="${f(base - 140)}" width="400" height="140" fill="${c}"/>`
    for (const [dx, tw, th] of [[-220, 70, 240], [150, 70, 240], [-45, 90, 320]]) {
      s += `<rect x="${f(cx + dx)}" y="${f(base - th)}" width="${tw}" height="${th}" fill="${c}"/>`
      s += `<polygon points="${f(cx + dx - 10)},${f(base - th)} ${f(cx + dx + tw / 2)},${f(base - th - 80)} ${f(cx + dx + tw + 10)},${f(base - th)}" fill="${c}"/>`
      s += `<line x1="${f(cx + dx + tw / 2)}" y1="${f(base - th - 80)}" x2="${f(cx + dx + tw / 2)}" y2="${f(base - th - 120)}" stroke="${c}" stroke-width="4"/><path d="M${f(cx + dx + tw / 2)} ${f(base - th - 120)} l40 10 l-40 10Z" fill="${hsl(h, 80, 45)}"/>`
    }
    for (let i = 0; i < 10; i++) s += `<rect x="${f(cx - 200 + i * 42)}" y="${f(base - 160)}" width="22" height="22" fill="${c}"/>`
    for (let i = 0; i < 8; i++) s += `<rect x="${f(cx - 180 + r() * 360)}" y="${f(base - 120 + r() * 80)}" width="10" height="16" fill="${hsl(45, 100, 65)}"/>`
    s += `<rect x="0" y="${f(base)}" width="${W}" height="${f(H - base)}" fill="${hsl(h, 25, 8)}"/>`
    return s
  },
  farm(r, h) {
    let s = sky('bg', hsl(200, 70, 60), hsl(40, 80, 80))
    s += `<circle cx="${f(150 + r() * 900)}" cy="120" r="60" fill="${hsl(48, 100, 65)}"/>`
    for (let i = 0; i < 4; i++) {
      const x = r() * W, y = 60 + r() * 140
      s += `<g fill="#fff" opacity=".9"><ellipse cx="${f(x)}" cy="${f(y)}" rx="70" ry="24"/><ellipse cx="${f(x + 40)}" cy="${f(y - 14)}" rx="44" ry="26"/></g>`
    }
    s += `<path d="${ridge(r, H * 0.5, 50, 8)}" fill="${hsl(h, 45, 45)}"/>`
    for (let i = 0; i < 9; i++) s += `<rect x="0" y="${f(H * 0.62 + i * 30)}" width="${W}" height="16" fill="${hsl(h + (i % 2 ? 0 : -50), 50, 35 + (i % 2) * 8)}"/>`
    const bx = 150 + r() * 700
    s += `<g transform="translate(${f(bx)} ${f(H * 0.32)})"><rect width="200" height="150" fill="${hsl(5, 65, 45)}"/><polygon points="-20,0 100,-80 220,0" fill="${hsl(5, 40, 30)}"/><rect x="70" y="70" width="60" height="80" fill="${hsl(30, 50, 85)}"/><path d="M70 70 L130 150 M130 70 L70 150" stroke="${hsl(5, 65, 45)}" stroke-width="6"/></g>`
    return s
  },
  stadium(r, h) {
    let s = sky('bg', hsl(h + 20, 60, 8), hsl(h, 50, 22))
    for (let i = 0; i < 4; i++) {
      const x = 100 + i * 330
      s += `<polygon points="${x},40 ${x - 220},${H} ${x + 220},${H}" fill="${hsl(h, 100, 90, 0.07)}"/><rect x="${x - 40}" y="20" width="80" height="30" rx="6" fill="#fff"/>`
    }
    s += `<path d="M0 ${f(H * 0.45)} Q${W / 2} ${f(H * 0.3)} ${W} ${f(H * 0.45)} L${W} ${f(H * 0.6)} L0 ${f(H * 0.6)} Z" fill="${hsl(h, 30, 18)}"/>`
    for (let i = 0; i < 300; i++) s += `<circle cx="${f(r() * W)}" cy="${f(H * 0.4 + r() * H * 0.18)}" r="2" fill="${hsl(r() * 360, 70, 65)}" opacity=".7"/>`
    s += `<rect x="0" y="${f(H * 0.6)}" width="${W}" height="${f(H * 0.4)}" fill="${hsl(125, 50, 32)}"/>`
    for (let i = 0; i < 6; i++) s += `<rect x="${i * 200}" y="${f(H * 0.6)}" width="100" height="${f(H * 0.4)}" fill="${hsl(125, 50, 36)}"/>`
    s += `<ellipse cx="${W / 2}" cy="${f(H * 0.8)}" rx="160" ry="50" fill="none" stroke="#fff" stroke-width="4" opacity=".8"/><line x1="${W / 2}" y1="${f(H * 0.6)}" x2="${W / 2}" y2="${H}" stroke="#fff" stroke-width="4" opacity=".8"/>`
    s += `<circle cx="${f(W / 2 + 200 + r() * 200)}" cy="${f(H * 0.35)}" r="28" fill="#fff"/><path d="M${f(W / 2 + 200)} ${f(H * 0.85)} q 120 -260 ${f(r() * 200)} -300" stroke="#fff" stroke-dasharray="8 10" stroke-width="3" fill="none" opacity=".5"/>`
    return s
  },
  ocean(r, h) {
    let s = sky('bg', hsl(h + 180, 60, 60), hsl(h + 160, 80, 80))
    s += `<circle cx="${f(200 + r() * 800)}" cy="${f(H * 0.45)}" r="80" fill="${hsl(40, 100, 70)}"/>`
    for (let i = 0; i < 6; i++) {
      const y = H * 0.5 + i * 45
      let d = `M0 ${f(y)}`
      for (let x = 0; x <= W; x += 60) d += ` Q${x + 30} ${f(y - 18 - r() * 10)} ${x + 60} ${f(y)}`
      s += `<path d="${d} L${W} ${H} L0 ${H} Z" fill="${hsl(h, 70, 45 - i * 5)}"/>`
    }
    const bx = 200 + r() * 700
    s += `<g transform="translate(${f(bx)} ${f(H * 0.52)})"><path d="M-110 0 L110 0 L80 40 L-80 40 Z" fill="${hsl(25, 50, 30)}"/><line x1="0" y1="0" x2="0" y2="-200" stroke="${hsl(25, 50, 20)}" stroke-width="6"/><path d="M5 -190 Q90 -110 5 -20 Z" fill="#f4efe6"/><path d="M-5 -170 Q-70 -100 -5 -30 Z" fill="#e8e0d0"/></g>`
    for (let i = 0; i < 5; i++) s += `<path d="M${f(r() * W)} ${f(80 + r() * 120)} q10 -10 20 0 q10 -10 20 0" stroke="#333" stroke-width="3" fill="none"/>`
    return s
  },
  underwater(r, h) {
    let s = sky('bg', hsl(h - 10, 70, 45), hsl(h + 20, 80, 8))
    for (let i = 0; i < 6; i++) s += `<polygon points="${f(r() * W)},0 ${f(r() * W - 100)},${H} ${f(r() * W + 100)},${H}" fill="#fff" opacity=".05"/>`
    s += `<path d="${ridge(r, H * 0.82, 60, 20)}" fill="${hsl(h + 20, 40, 14)}"/>`
    const dx = 250 + r() * 600
    s += `<g transform="translate(${f(dx)} ${f(H * 0.68)})"><path d="M-150 60 A150 150 0 0 1 150 60 Z" fill="${hsl(h, 40, 75, 0.35)}" stroke="${hsl(h, 60, 85)}" stroke-width="4"/><rect x="-100" y="20" width="40" height="40" fill="${hsl(40, 90, 65)}"/><rect x="-20" y="0" width="50" height="60" fill="${hsl(40, 90, 65)}"/><rect x="60" y="25" width="40" height="35" fill="${hsl(40, 90, 65)}"/></g>`
    for (let i = 0; i < 12; i++) {
      const x = r() * W, y = H * 0.75 + r() * 60
      s += `<path d="M${f(x)} ${f(y + 60)} q-20 -60 0 -120 q20 -40 0 -80" stroke="${hsl(140, 50, 35)}" stroke-width="8" fill="none"/>`
    }
    for (let i = 0; i < 8; i++) {
      const x = r() * W, y = 100 + r() * 300
      s += `<path d="M${f(x)} ${f(y)} q20 -14 40 0 q-20 14 -40 0 Z M${f(x + 40)} ${f(y)} l14 -10 l0 20 Z" fill="${hsl(20 + r() * 40, 90, 60)}"/>`
    }
    for (let i = 0; i < 30; i++) s += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(r() * 6 + 2)}" fill="none" stroke="#fff" opacity=".4"/>`
    return s
  },
  blocks(r, h) {
    let s = sky('bg', hsl(h + 200, 50, 10), hsl(h + 220, 50, 20))
    const sz = 75
    for (let x = 0; x < W; x += sz) for (let y = 0; y < H; y += sz) s += `<rect x="${x}" y="${y}" width="${sz}" height="${sz}" fill="none" stroke="#fff" stroke-opacity=".05"/>`
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(r() * 16) * sz, y = Math.floor(r() * 9) * sz, c = h + Math.floor(r() * 4) * 40
      s += `<rect x="${x + 4}" y="${y + 4}" width="${sz - 8}" height="${sz - 8}" rx="10" fill="${hsl(c, 80, 55)}"/><rect x="${x + 4}" y="${y + 4}" width="${sz - 8}" height="14" rx="6" fill="#fff" opacity=".25"/>`
    }
    s += glow('g', W / 2, H / 2, 300, hsl(h, 100, 60, 0.25))
    s += `<circle cx="${f(300 + r() * 600)}" cy="${f(200 + r() * 250)}" r="22" fill="#fff"/>`
    return s
  },
  town(r, h) {
    let s = sky('bg', hsl(240, 50, 12), hsl(260, 40, 30)) + stars(r, 120, H * 0.5)
    const mx = 150 + r() * 900
    s += glow('m', mx, 130, 160, hsl(50, 80, 80, 0.5)) + `<circle cx="${f(mx)}" cy="130" r="55" fill="${hsl(50, 70, 90)}"/>`
    let x = -20
    while (x < W) {
      const w = 110 + r() * 90, ht = 180 + r() * 200, y = H - ht
      s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(ht)}" fill="${hsl(h + 200, 25, 16 + r() * 8)}"/><polygon points="${f(x - 10)},${f(y)} ${f(x + w / 2)},${f(y - 60)} ${f(x + w + 10)},${f(y)}" fill="${hsl(h - 20, 40, 22)}"/>`
      for (let i = 0; i < 4; i++) if (r() > 0.35) s += `<rect x="${f(x + 15 + (i % 2) * (w / 2 - 10))}" y="${f(y + 30 + Math.floor(i / 2) * 70)}" width="${f(w / 2 - 30)}" height="40" fill="${hsl(h, 100, 65)}" opacity=".9"/>`
      x += w + 6
    }
    s += `<rect x="0" y="${H - 30}" width="${W}" height="30" fill="${hsl(h + 200, 20, 10)}"/>`
    return s
  },
  city(r, h) {
    let s = sky('bg', hsl(h + 240, 60, 8), hsl(h, 70, 28))
    for (let layer = 0; layer < 2; layer++) {
      let x = 0
      while (x < W) {
        const w = 60 + r() * 90, ht = 200 + r() * 330 - layer * 80
        s += `<rect x="${f(x)}" y="${f(H - ht)}" width="${f(w)}" height="${f(ht)}" fill="${hsl(h + 240, 40, 8 + layer * 5)}"/>`
        for (let wy = H - ht + 20; wy < H - 20; wy += 26) for (let wx = x + 10; wx < x + w - 14; wx += 20) if (r() > 0.6) s += `<rect x="${f(wx)}" y="${f(wy)}" width="8" height="12" fill="${hsl(h + (r() > 0.5 ? 0 : 180), 100, 65)}" opacity="${f(0.4 + r() * 0.6)}"/>`
        x += w + 4
      }
    }
    for (let i = 0; i < 70; i++) {
      const x = r() * W, y = r() * H
      s += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x - 8)}" y2="${f(y + 30)}" stroke="${hsl(h + 180, 80, 80)}" stroke-width="1.5" opacity=".35"/>`
    }
    s += `<rect x="${f(100 + r() * 800)}" y="${f(200 + r() * 150)}" width="220" height="60" rx="8" fill="none" stroke="${hsl(h, 100, 60)}" stroke-width="5"/>`
    s += `<rect x="0" y="${H - 20}" width="${W}" height="20" fill="${hsl(h, 100, 55, 0.4)}"/>`
    return s
  },
  desert(r, h) {
    let s = sky('bg', hsl(h + 170, 50, 60), hsl(h, 80, 75))
    s += `<circle cx="${f(200 + r() * 800)}" cy="140" r="70" fill="${hsl(45, 100, 85)}"/>`
    s += `<path d="${ridge(r, H * 0.5, 80, 10)}" fill="${hsl(h - 10, 50, 55)}"/>`
    s += `<path d="${ridge(r, H * 0.68, 50, 7)}" fill="${hsl(h, 60, 45)}"/>`
    const tx = 200 + r() * 600
    s += `<g transform="translate(${f(tx)} ${f(H * 0.72)})"><rect x="0" y="40" width="260" height="50" rx="20" fill="${hsl(90, 25, 25)}"/><rect x="30" y="0" width="190" height="55" rx="12" fill="${hsl(90, 25, 35)}"/><rect x="60" y="-30" width="110" height="40" rx="18" fill="${hsl(90, 25, 30)}"/><rect x="160" y="-20" width="170" height="16" rx="6" fill="${hsl(90, 20, 22)}"/>${[20, 70, 120, 170, 220].map((c) => `<circle cx="${c + 10}" cy="85" r="16" fill="${hsl(0, 0, 15)}"/>`).join('')}</g>`
    for (let i = 0; i < 6; i++) s += `<circle cx="${f(r() * W)}" cy="${f(H * 0.85 + r() * 60)}" r="${f(20 + r() * 40)}" fill="${hsl(30, 20, 70)}" opacity=".35"/>`
    return s
  },
  dojo(r, h) {
    let s = sky('bg', hsl(h + 20, 80, 55), hsl(h + 40, 90, 75))
    s += `<circle cx="${W / 2}" cy="${f(H * 0.42)}" r="180" fill="${hsl(h, 90, 50)}"/>`
    s += `<path d="${ridge(r, H * 0.6, 120, 6)}" fill="${hsl(h + 10, 40, 30)}"/>`
    const c = hsl(h, 40, 10)
    s += `<g fill="${c}"><rect x="${W / 2 - 260}" y="${f(H * 0.55)}" width="30" height="${f(H * 0.45)}"/><rect x="${W / 2 + 230}" y="${f(H * 0.55)}" width="30" height="${f(H * 0.45)}"/><path d="M${W / 2 - 330} ${f(H * 0.5)} Q${W / 2} ${f(H * 0.44)} ${W / 2 + 330} ${f(H * 0.5)} L${W / 2 + 320} ${f(H * 0.56)} L${W / 2 - 320} ${f(H * 0.56)} Z"/><rect x="${W / 2 - 280}" y="${f(H * 0.6)}" width="560" height="22"/></g>`
    s += `<rect x="0" y="${f(H * 0.85)}" width="${W}" height="${f(H * 0.15)}" fill="${c}"/>`
    for (let i = 0; i < 30; i++) s += `<ellipse cx="${f(r() * W)}" cy="${f(r() * H * 0.8)}" rx="6" ry="3" fill="${hsl(340, 80, 85)}" transform="rotate(${f(r() * 180)} 0 0)" opacity=".8"/>`
    return s
  },
  mountains(r, h) {
    let s = sky('bg', hsl(h + 180, 40, 30), hsl(h, 80, 65))
    s += `<circle cx="${f(200 + r() * 800)}" cy="${f(H * 0.4)}" r="70" fill="${hsl(h + 20, 100, 85)}"/>`
    for (let i = 0; i < 4; i++) s += `<path d="${ridge(r, H * (0.45 + i * 0.12), 160 - i * 30, 9 + i * 2)}" fill="${hsl(h + 200, 25, 40 - i * 9)}"/>`
    const wx = 200 + r() * 700, wy = H * 0.62
    s += `<g transform="translate(${f(wx)} ${f(wy)})" fill="${hsl(0, 0, 5)}"><path d="M0 0 L20 -60 L40 -40 L60 -80 L70 -40 L90 -20 L100 10 L60 20 L50 60 L30 60 L30 20 Z"/></g>`
    return s
  },
  tower(r, h) {
    let s = sky('bg', hsl(h, 60, 10), hsl(h + 30, 60, 30)) + stars(r, 160, H * 0.7)
    s += `<path d="${ridge(r, H * 0.75, 80)}" fill="${hsl(h, 30, 12)}"/>`
    const tx = 380 + r() * 400, c = hsl(h, 30, 7)
    s += `<g fill="${c}"><rect x="${f(tx)}" y="${f(H * 0.25)}" width="90" height="${f(H * 0.6)}"/><polygon points="${f(tx - 20)},${f(H * 0.25)} ${f(tx + 45)},${f(H * 0.02)} ${f(tx + 110)},${f(H * 0.25)}"/><rect x="${f(tx - 140)}" y="${f(H * 0.5)}" width="120" height="${f(H * 0.35)}"/><polygon points="${f(tx - 155)},${f(H * 0.5)} ${f(tx - 80)},${f(H * 0.36)} ${f(tx - 5)},${f(H * 0.5)}"/><rect x="${f(tx + 110)}" y="${f(H * 0.45)}" width="130" height="${f(H * 0.4)}"/><polygon points="${f(tx + 95)},${f(H * 0.45)} ${f(tx + 175)},${f(H * 0.3)} ${f(tx + 255)},${f(H * 0.45)}"/></g>`
    for (let i = 0; i < 10; i++) s += `<rect x="${f(tx - 120 + r() * 340)}" y="${f(H * 0.32 + r() * H * 0.45)}" width="10" height="18" rx="5" fill="${hsl(h + 180, 100, 70)}"/>`
    for (let i = 0; i < 40; i++) s += `<circle cx="${f(tx + 45 + (r() - 0.5) * 500)}" cy="${f(r() * H * 0.6)}" r="${f(r() * 3 + 1)}" fill="${hsl(h + 60, 100, 75)}"/>`
    s += glow('orb', tx + 45, H * 0.02, 70, hsl(h + 60, 100, 70, 0.9))
    return s
  },
  snow(r, h) {
    let s = sky('bg', hsl(h + 10, 50, 50), hsl(h, 60, 85))
    s += `<path d="${ridge(r, H * 0.45, 200, 7)}" fill="${hsl(h, 30, 92)}"/>`
    s += `<path d="${ridge(r, H * 0.6, 100, 9)}" fill="${hsl(h, 40, 80)}"/>`
    s += `<path d="M0 ${H} L0 ${f(H * 0.75)} Q${W / 2} ${f(H * 0.62)} ${W} ${f(H * 0.85)} L${W} ${H} Z" fill="#fff"/>`
    const px = 300 + r() * 500, py = H * 0.72
    s += `<g transform="translate(${f(px)} ${f(py)}) rotate(-15)"><ellipse cx="0" cy="0" rx="34" ry="46" fill="#1b1f2a"/><ellipse cx="0" cy="8" rx="22" ry="34" fill="#fff"/><circle cx="-8" cy="-22" r="5" fill="#fff"/><circle cx="-8" cy="-22" r="2" fill="#000"/><path d="M8 -20 l22 6 l-22 6 Z" fill="${hsl(35, 100, 55)}"/></g>`
    for (let i = 0; i < 90; i++) s += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(r() * 3 + 1)}" fill="#fff" opacity=".8"/>`
    return s
  },
}

function svg(slug, variant) {
  const g = GAMES[slug]
  const r = rng(`${slug}#${variant}`)
  const hue = g.hue + (variant ? (variant - 2) * 18 : 0)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${scenes[g.scene](r, hue)}<rect width="${W}" height="${H}" fill="url(#vig)"/><defs><radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs></svg>\n`
}

mkdirSync(OUT, { recursive: true })
for (const slug of Object.keys(GAMES)) {
  writeFileSync(resolve(OUT, `${slug}.svg`), svg(slug, 0))
  for (let i = 1; i <= SHOTS; i++) writeFileSync(resolve(OUT, `${slug}-${i}.svg`), svg(slug, i))
}
console.log(`สร้างภาพ ${Object.keys(GAMES).length} เกม (ปก + ภาพหน้าจอ ${SHOTS} ภาพ) ที่ ${OUT}`)
