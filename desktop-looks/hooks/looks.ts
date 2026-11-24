// The looks: a palette for each mode and the art drawn behind the conversation.
// Each scene is one SVG holding a light and a dark drawing; CSS shows the one
// that matches the mode the app is in.

export type Palette = {
  bg: string
  panel: string
  text: string
  muted: string
  accent: string
  a2: string
  a3: string
}

export type Look = {
  id: string
  name: string
  L: Palette
  D: Palette
  art: (c: Palette, uid: string) => string
}

const W = 400
const H = 250

// Small seeded random, so a scene draws the same every time.
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

const n = (v: number) => Math.round(v * 10) / 10

const dots = (color: string, x0: number, y0: number, w: number, h: number, step: number) => {
  let s = ''
  for (let x = x0 + 6; x < x0 + w; x += step) {
    for (let y = y0 + 6; y < y0 + h; y += step) {
      const fade = 1 - ((x - x0) / w) * 0.8
      s += `<circle cx="${x}" cy="${y}" r="1.3" fill="${color}" opacity="${fade.toFixed(2)}"/>`
    }
  }
  return s
}

const frond = (x: number, y: number, angle: number, len: number, color: string, op: number) => {
  let leaves = ''
  const count = 9
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1)
    const px = n(t * len)
    const size = 38 * (1 - t * 0.55)
    const side = i % 2 ? -1 : 1
    leaves += `<path d="M${px} 0 q ${n(size * 0.5)} ${n(side * size * 0.55)} ${n(size)} ${n(side * size * 0.15)} q ${n(-size * 0.45)} ${n(-side * size * 0.15)} ${n(-size)} ${n(-side * size * 0.15)}Z" fill="${color}" transform="rotate(${side * -28} ${px} 0)"/>`
  }
  return `<g transform="translate(${x} ${y}) rotate(${angle})" opacity="${op}"><g class="sway"><path d="M0 0 Q ${len / 2} -6 ${len} 0" stroke="${color}" stroke-width="2" fill="none"/>${leaves}</g></g>`
}

const fan = (x: number, y: number, rot: number, color: string) => {
  let s = `<g transform="translate(${x} ${y}) rotate(${rot})" stroke="${color}" fill="none">`
  for (let r = 24; r <= 84; r += 15) s += `<path d="M${r} 0 A ${r} ${r} 0 0 1 0 ${r}" stroke-width="1"/>`
  for (let a = 0; a <= 90; a += 11.25) {
    const rad = (a * Math.PI) / 180
    s += `<line x1="${n(24 * Math.cos(rad))}" y1="${n(24 * Math.sin(rad))}" x2="${n(84 * Math.cos(rad))}" y2="${n(84 * Math.sin(rad))}" stroke-width=".7"/>`
  }
  return s + `<path d="M0 0 L 14 0 A 14 14 0 0 1 0 14 Z" fill="${color}" stroke="none"/></g>`
}

// Stars kept away from the middle of the window, where the words sit.
const starField = (color: string, count: number, seed: number) => {
  const rnd = seeded(seed)
  let s = ''
  let placed = 0
  while (placed < count) {
    const x = rnd() * W
    const y = rnd() * H
    const inMiddle = x > 110 && x < 290 && y > 40 && y < 210
    if (inMiddle) continue
    const big = rnd() > 0.82
    const delay = n(rnd() * 6)
    const twinkle = rnd() > 0.45 ? ' class="tw"' : ''
    s += `<circle${twinkle} cx="${n(x)}" cy="${n(y)}" r="${big ? 1.4 : 0.8}" fill="${color}" opacity="${big ? 0.9 : 0.6}" style="animation-delay:-${delay}s"/>`
    placed++
  }
  return s
}

// A spiral galaxy drawn flat around 0,0; the caller tilts and places it.
const galaxy = (c: Palette, u: string) => {
  const rnd = seeded(19)
  let arms = ''
  let dust = ''
  for (let arm = 0; arm < 2; arm++) {
    const pts: string[] = []
    for (let i = 0; i <= 80; i++) {
      const t = i / 80
      const theta = t * 3.6 * Math.PI + arm * Math.PI
      const r = 6 + t * 92
      const x = r * Math.cos(theta)
      const y = r * Math.sin(theta)
      pts.push(`${n(x)} ${n(y)}`)
      for (let k = 0; k < 2; k++) {
        const jx = x + (rnd() - 0.5) * 14 * (0.4 + t)
        const jy = y + (rnd() - 0.5) * 14 * (0.4 + t)
        const op = n((1 - t) * 0.6 + 0.25)
        const col = rnd() > 0.7 ? c.a3 : c.text
        dust += `<circle cx="${n(jx)}" cy="${n(jy)}" r="${rnd() > 0.85 ? 1.2 : 0.6}" fill="${col}" opacity="${op}"/>`
      }
    }
    arms += `<path d="M${pts.join(' L')}" fill="none" stroke="${c.accent}" stroke-width="10" stroke-linecap="round" opacity=".35"/>`
  }
  return `<defs>
    <radialGradient id="core${u}"><stop offset="0" stop-color="${c.a3}" stop-opacity=".95"/><stop offset=".35" stop-color="${c.accent}" stop-opacity=".45"/><stop offset="1" stop-color="${c.accent}" stop-opacity="0"/></radialGradient>
    <radialGradient id="halo${u}"><stop offset="0" stop-color="${c.a2}" stop-opacity=".9"/><stop offset="1" stop-color="${c.a2}" stop-opacity="0"/></radialGradient>
    <filter id="armBlur${u}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>
  <circle r="115" fill="url(#halo${u})"/>
  <g filter="url(#armBlur${u})">${arms}</g>
  ${dust}
  <circle r="34" fill="url(#core${u})"/>`
}

// Shooting stars: each sits at its own place and angle, on its own timer.
const METEORS: [number, number, number, number, number][] = [
  // x, y, angle, seconds per pass, delay
  [20, 18, 22, 19, 1],
  [250, 8, 32, 27, 9],
  [330, 70, 145, 23, 15],
  [10, 150, 18, 31, 5],
  [140, 225, -12, 29, 21],
  [370, 120, 160, 37, 27],
]
const meteors = (c: Palette, u: string) =>
  `<defs><linearGradient id="tail${u}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="34" y2="0"><stop offset="0" stop-color="${c.text}" stop-opacity="0"/><stop offset="1" stop-color="${c.text}" stop-opacity=".95"/></linearGradient></defs>` +
  METEORS.map(
    ([x, y, a, dur, delay]) =>
      `<g transform="translate(${x} ${y}) rotate(${a})"><g class="meteor" style="animation-duration:${dur}s;animation-delay:${delay}s"><line x1="0" y1="0" x2="34" y2="0" stroke="url(#tail${u})" stroke-width="1.3" stroke-linecap="round"/><circle cx="34" cy="0" r="1.1" fill="${c.text}"/></g></g>`,
  ).join('')

const MOTION = `
.tw { animation: tw 6s ease-in-out infinite; }
@keyframes tw { 0%, 100% { opacity: .9; } 50% { opacity: .35; } }
.sway { animation: sway 9s ease-in-out infinite; transform-box: fill-box; transform-origin: 0 50%; }
@keyframes sway { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(2.5deg); } }
.drift { animation: drift 40s ease-in-out infinite; }
@keyframes drift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-14px, 8px); } }
.wave { animation: wave 14s ease-in-out infinite; }
@keyframes wave { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-18px); } }
.meteor { opacity: 0; animation: meteor 23s linear infinite; }
@keyframes meteor { 0% { opacity: 0; transform: translateX(0); } 1.5% { opacity: .95; } 6% { opacity: 0; transform: translateX(130px); } 100% { opacity: 0; transform: translateX(130px); } }
.galaxy { animation: spin 420s linear infinite; transform-box: fill-box; transform-origin: 50% 50%; }
.spin { animation: spin 240s linear infinite; transform-box: fill-box; transform-origin: 50% 50%; }
@keyframes spin { to { transform: rotate(360deg); } }
`

export const LOOKS: Look[] = [
  {
    id: 'deep-space',
    name: 'Deep Space',
    L: { bg: '#f2f0f8', panel: '#e8e5f2', text: '#1c1a33', muted: '#5f5b7d', accent: '#5a48c9', a2: '#d9cff3', a3: '#e9b9a2' },
    D: { bg: '#070a17', panel: '#0e1226', text: '#e9eaf7', muted: '#9a9dc0', accent: '#8f88ff', a2: '#2a1b5c', a3: '#e2a882' },
    art: (c, u) => `<defs>
      <radialGradient id="nebA${u}"><stop offset="0" stop-color="${c.a2}"/><stop offset="1" stop-color="${c.a2}" stop-opacity="0"/></radialGradient>
    </defs>
    <g class="drift"><ellipse cx="30" cy="20" rx="150" ry="85" fill="url(#nebA${u})"/></g>
    <g transform="translate(345 198) rotate(-28) scale(1 .46)" opacity=".9"><g class="galaxy">${galaxy(c, u)}</g></g>
    ${starField(c.text, 70, 7)}
    ${meteors(c, u)}
    <circle cx="352" cy="38" r="5" fill="${c.muted}" opacity=".6"/>`,
  },
  {
    id: 'minimal',
    name: 'Modern Minimal',
    L: { bg: '#f7f7f5', panel: '#eeeeeb', text: '#1b1b1a', muted: '#6d6d68', accent: '#3b5bdb', a2: '#c3cdf5', a3: '#cfcfc8' },
    D: { bg: '#141518', panel: '#1b1c20', text: '#ececee', muted: '#9a9ba3', accent: '#8ea2ff', a2: '#2e3870', a3: '#3a3c44' },
    art: (c, u) => `<defs><radialGradient id="g${u}"><stop offset="0" stop-color="${c.a2}"/><stop offset="1" stop-color="${c.a2}" stop-opacity="0"/></radialGradient></defs>
      <g class="drift"><circle cx="380" cy="10" r="140" fill="url(#g${u})" opacity=".9"/></g>
      ${dots(c.a3, 0, 170, 120, 80, 12)}`,
  },
  {
    id: 'botanical',
    name: 'Botanical',
    L: { bg: '#f1ead8', panel: '#e7dec7', text: '#2c2a1f', muted: '#6b6450', accent: '#4f7a3a', a2: '#9bb87a', a3: '#c4a77a' },
    D: { bg: '#1a1f17', panel: '#20261c', text: '#ebe6d6', muted: '#a9a58f', accent: '#9cc27a', a2: '#40593a', a3: '#5c4a33' },
    art: c => `${frond(30, 265, -58, 170, c.a2, 0.85)}${frond(70, 270, -30, 120, c.a3, 0.7)}${frond(392, -12, 128, 150, c.a2, 0.75)}${frond(405, 40, 160, 100, c.a3, 0.6)}`,
  },
  {
    id: 'coastal',
    name: 'Coastal',
    L: { bg: '#eef4f5', panel: '#e1ebed', text: '#17303a', muted: '#567079', accent: '#1f7a8c', a2: '#a9d4dc', a3: '#e9dbbb' },
    D: { bg: '#0e1a20', panel: '#132229', text: '#e3eef0', muted: '#8fa9b0', accent: '#5cc3d4', a2: '#1c4150', a3: '#3a3426' },
    art: c => `<rect x="0" y="236" width="400" height="20" fill="${c.a3}"/>
      ${[0, 1, 2, 3].map(i => `<path class="wave" style="animation-delay:-${i * 3}s" d="M-30 ${206 + i * 9} C 20 ${196 + i * 9}, 70 ${216 + i * 9}, 120 ${206 + i * 9} S 220 ${196 + i * 9}, 270 ${206 + i * 9} S 380 ${216 + i * 9}, 440 ${204 + i * 9} V 260 H -30 Z" fill="${c.a2}" opacity="${0.35 + i * 0.12}"/>`).join('')}`,
  },
  {
    id: 'zen',
    name: 'Zen Garden',
    L: { bg: '#f2efe8', panel: '#e8e4da', text: '#24221e', muted: '#6e6a60', accent: '#8a5a44', a2: '#d6cfbf', a3: '#8d877a' },
    D: { bg: '#1a1917', panel: '#21201d', text: '#e9e5dc', muted: '#a29d90', accent: '#c9906f', a2: '#34312c', a3: '#4f4a42' },
    art: c => `${[0, 1, 2, 3, 4, 5, 6].map(i => `<line x1="0" x2="400" y1="${192 + i * 9}" y2="${192 + i * 9}" stroke="${c.a2}" stroke-width="1.6"/>`).join('')}
      <rect x="290" y="150" width="120" height="110" fill="${c.bg}"/>
      ${[1, 2, 3, 4, 5, 6].map(i => `<ellipse cx="350" cy="214" rx="${18 + i * 10}" ry="${11 + i * 7}" fill="none" stroke="${c.a2}" stroke-width="1.6"/>`).join('')}
      <ellipse cx="350" cy="214" rx="17" ry="10" fill="${c.a3}"/>
      <ellipse cx="58" cy="40" rx="10" ry="6" fill="${c.a3}" opacity=".7"/>
      ${[1, 2, 3].map(i => `<ellipse cx="58" cy="40" rx="${10 + i * 8}" ry="${6 + i * 5}" fill="none" stroke="${c.a2}" stroke-width="1.4"/>`).join('')}`,
  },
  {
    id: 'nordic',
    name: 'Nordic',
    L: { bg: '#f3f5f7', panel: '#e7ebef', text: '#1e2630', muted: '#61707f', accent: '#3f6e8c', a2: '#c6d2dc', a3: '#dbe2e8' },
    D: { bg: '#12171d', panel: '#171e25', text: '#e6ecf1', muted: '#93a1ae', accent: '#8fb8d4', a2: '#243443', a3: '#1b2733' },
    art: c => `<circle cx="330" cy="150" r="26" fill="${c.a2}" opacity=".7"/>
      <path d="M0 200 L60 150 L110 185 L170 130 L230 190 L290 160 L350 195 L400 170 V260 H0Z" fill="${c.a3}"/>
      <path d="M0 225 L70 185 L130 215 L200 175 L260 220 L330 190 L400 215 V260 H0Z" fill="${c.a2}"/>`,
  },
  {
    id: 'deco',
    name: 'Art Deco',
    L: { bg: '#f5efe1', panel: '#ebe3cf', text: '#1d2333', muted: '#5f6372', accent: '#9a7322', a2: '#cdb376', a3: '#1d2333' },
    D: { bg: '#10141f', panel: '#151a27', text: '#efe6cf', muted: '#a9a18a', accent: '#d8b35a', a2: '#806a33', a3: '#283048' },
    art: c => `${fan(0, 0, 0, c.a2)}${fan(400, 250, 180, c.a2)}
      <rect x="6" y="6" width="388" height="238" fill="none" stroke="${c.a2}" stroke-width=".8"/>
      <rect x="10" y="10" width="380" height="230" fill="none" stroke="${c.a2}" stroke-width=".5"/>`,
  },
  {
    id: 'bauhaus',
    name: 'Bauhaus',
    L: { bg: '#f4f1ea', panel: '#ebe6db', text: '#1a1a1a', muted: '#5d5a54', accent: '#c8442f', a2: '#2f5aa8', a3: '#e2b33c' },
    D: { bg: '#161616', panel: '#1d1d1c', text: '#eeeae2', muted: '#a19d95', accent: '#e5654f', a2: '#4f7bd0', a3: '#d9ad42' },
    art: c => `<g opacity=".28"><circle cx="370" cy="30" r="62" fill="${c.a3}"/>
      <path d="M300 0 A 40 40 0 0 0 380 0 Z" fill="${c.accent}"/>
      <rect x="-10" y="190" width="70" height="70" fill="${c.a2}"/>
      <path d="M60 250 A 40 40 0 0 1 140 250 Z" fill="${c.accent}"/>
      <line x1="330" y1="250" x2="400" y2="180" stroke="${c.text}" stroke-width="3"/></g>`,
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    L: { bg: '#fbeff4', panel: '#f4e2ec', text: '#2a1736', muted: '#6e5878', accent: '#b8327f', a2: '#f5adc9', a3: '#b79ee6' },
    D: { bg: '#150b22', panel: '#1c1030', text: '#f4e8ff', muted: '#b19cc6', accent: '#ff5fb7', a2: '#ff8a3c', a3: '#5d348f' },
    art: (c, u) => `<defs><linearGradient id="sun${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.a2}"/><stop offset="1" stop-color="${c.accent}"/></linearGradient>
      <clipPath id="sc${u}"><circle cx="320" cy="196" r="46"/></clipPath></defs>
      <g clip-path="url(#sc${u})" opacity=".55"><rect x="270" y="150" width="100" height="46" fill="url(#sun${u})"/>
      ${[0, 1, 2, 3].map(i => `<rect x="270" y="${172 + i * 6}" width="100" height="${n(1.5 + i * 0.6)}" fill="${c.bg}"/>`).join('')}</g>
      <rect x="0" y="196" width="400" height="60" fill="${c.bg}"/>
      <g stroke="${c.a3}" stroke-width="1" opacity=".8">${[0, 1, 2, 3, 4, 5].map(i => `<line x1="0" x2="400" y1="${198 + i * i * 2 + i * 3}" y2="${198 + i * i * 2 + i * 3}"/>`).join('')}
      ${[-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(i => `<line x1="${200 + i * 8}" y1="198" x2="${200 + i * 60}" y2="260"/>`).join('')}</g>`,
  },
  {
    id: 'night-sky',
    name: 'Night Sky',
    L: { bg: '#f3f2f8', panel: '#e9e7f2', text: '#1f1d33', muted: '#646180', accent: '#5b4fc4', a2: '#dcd5f3', a3: '#a7a0d8' },
    D: { bg: '#0b0d1a', panel: '#111427', text: '#e8e9f6', muted: '#9a9cbc', accent: '#9d97ff', a2: '#2b2066', a3: '#dcdcff' },
    art: (c, u) => `<defs><radialGradient id="neb${u}"><stop offset="0" stop-color="${c.a2}"/><stop offset="1" stop-color="${c.a2}" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="60" cy="210" rx="140" ry="70" fill="url(#neb${u})"/>
      ${starField(c.a3, 26, 3)}
      <circle cx="356" cy="40" r="20" fill="${c.a3}" opacity=".85"/><circle cx="364" cy="34" r="18" fill="${c.bg}"/>`,
  },
  {
    id: 'desert',
    name: 'Desert',
    L: { bg: '#f6ede2', panel: '#efe2d2', text: '#2e2119', muted: '#735f50', accent: '#b5562e', a2: '#ebcaa8', a3: '#dba67a' },
    D: { bg: '#1d1512', panel: '#251b17', text: '#f2e6da', muted: '#b19d8d', accent: '#e48a5c', a2: '#3a271f', a3: '#583828' },
    art: c => `<circle cx="90" cy="175" r="44" fill="${c.a3}" opacity=".55"/>
      <path d="M0 200 C 80 175, 160 215, 240 195 S 360 180, 400 195 V260 H0Z" fill="${c.a2}"/>
      <path d="M0 230 C 90 210, 200 245, 280 222 S 380 215, 400 225 V260 H0Z" fill="${c.a3}" opacity=".7"/>`,
  },
  {
    id: 'stationery',
    name: 'Stationery',
    L: { bg: '#fbf8f1', panel: '#f2ede2', text: '#2a2a33', muted: '#6a6a74', accent: '#3d63b8', a2: '#d3def2', a3: '#e9a9a9' },
    D: { bg: '#1b1c22', panel: '#22232a', text: '#ecebf0', muted: '#a3a3ad', accent: '#8eaaf0', a2: '#292c38', a3: '#5c3439' },
    art: c => `${Array.from({ length: 14 }, (_, i) => `<line x1="0" x2="400" y1="${22 + i * 17}" y2="${22 + i * 17}" stroke="${c.a2}" stroke-width="1"/>`).join('')}
      <line x1="16" x2="16" y1="0" y2="250" stroke="${c.a3}" stroke-width="1.2"/>
      <rect x="330" y="-6" width="90" height="22" fill="${c.accent}" opacity=".22" transform="rotate(18 370 5)"/>`,
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    L: { bg: '#faf7f4', panel: '#f2ede9', text: '#2b2730', muted: '#6b6570', accent: '#7a5cb0', a2: '#f2c4d1', a3: '#bfe1d6' },
    D: { bg: '#17151b', panel: '#1e1b23', text: '#ece8f0', muted: '#a59eae', accent: '#b9a0e8', a2: '#43263a', a3: '#1d3a33' },
    art: (c, u) => `<defs><filter id="b${u}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter></defs>
      <g filter="url(#b${u})" opacity=".9"><g class="drift"><ellipse cx="370" cy="20" rx="80" ry="50" fill="${c.a2}"/>
      <ellipse cx="320" cy="-5" rx="50" ry="30" fill="${c.accent}" opacity=".25"/></g>
      <ellipse cx="30" cy="230" rx="90" ry="55" fill="${c.a3}"/>
      <ellipse cx="90" cy="250" rx="50" ry="30" fill="${c.a2}" opacity=".6"/></g>`,
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    L: { bg: '#eef3f9', panel: '#e2eaf3', text: '#13263f', muted: '#536780', accent: '#1d5fbf', a2: '#d5e2f2', a3: '#9fbbe0' },
    D: { bg: '#0c1f3a', panel: '#0f2546', text: '#e6eefa', muted: '#93a9c8', accent: '#7fb6ff', a2: '#16335a', a3: '#2f5689' },
    art: c => `${Array.from({ length: 41 }, (_, i) => `<line x1="${i * 10}" x2="${i * 10}" y1="0" y2="250" stroke="${c.a2}" stroke-width="${i % 5 ? 0.5 : 1}"/>`).join('')}
      ${Array.from({ length: 26 }, (_, i) => `<line y1="${i * 10}" y2="${i * 10}" x1="0" x2="400" stroke="${c.a2}" stroke-width="${i % 5 ? 0.5 : 1}"/>`).join('')}
      <g stroke="${c.a3}" fill="none" stroke-width="1.2"><g class="spin"><circle cx="355" cy="45" r="30" stroke-dasharray="6 4"/></g><circle cx="355" cy="45" r="12"/>
      <line x1="315" x2="395" y1="45" y2="45"/><line x1="355" x2="355" y1="5" y2="85"/>
      <line x1="30" x2="130" y1="225" y2="225"/><line x1="30" x2="30" y1="219" y2="231"/><line x1="130" x2="130" y1="219" y2="231"/></g>`,
  },
]

// One SVG for both modes: the app's own mode picks which drawing shows.
export const sceneSvg = (look: Look) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
  `<style>${MOTION}
.dk { display: none; }
@media (prefers-color-scheme: dark) { .lt { display: none; } .dk { display: inline; } }</style>` +
  `<g class="lt"><rect x="-20" y="-20" width="${W + 40}" height="${H + 40}" fill="${look.L.bg}"/>${look.art(look.L, 'l')}</g>` +
  `<g class="dk"><rect x="-20" y="-20" width="${W + 40}" height="${H + 40}" fill="${look.D.bg}"/>${look.art(look.D, 'd')}</g>` +
  `</svg>`

// Blend two hex colors; t = 0 is a, t = 1 is b.
export const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16))
  return '#' + pa.map((v, i) => Math.round(v + ((pb[i] ?? v) - v) * t).toString(16).padStart(2, '0')).join('')
}
