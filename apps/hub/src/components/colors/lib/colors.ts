export type RGB = { r: number; g: number; b: number };
export type Oklch = { L: number; C: number; H: number };
export type Stop = { stop: number; hex: string; L: number; C: number; H: number };

export const STOPS: number[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const L_TARGET: Record<number, number> = { 50: .971, 100: .937, 200: .886, 300: .811, 400: .711, 500: .637, 600: .577, 700: .505, 800: .444, 900: .396, 950: .262 };
const C_CURVE: Record<number, number> = { 50: .10, 100: .22, 200: .42, 300: .66, 400: .90, 500: 1, 600: 1, 700: .94, 800: .82, 900: .72, 950: .55 };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const toSrgb = (c: number) => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

export function hexToRgb(hex: string): RGB {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return { r: parseInt(hex.slice(0, 2), 16) / 255, g: parseInt(hex.slice(2, 4), 16) / 255, b: parseInt(hex.slice(4, 6), 16) / 255 };
}
export function rgbToHex({ r, g, b }: RGB): string {
  const h = (v: number) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0');
  return ('#' + h(r) + h(g) + h(b)).toUpperCase();
}
export function rgbToOklch({ r, g, b }: RGB): Oklch {
  r = toLinear(r); g = toLinear(g); b = toLinear(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  let H = Math.atan2(B, A) * 180 / Math.PI; if (H < 0) H += 360;
  return { L, C: Math.hypot(A, B), H };
}
export function oklchToRgb(L: number, C: number, H: number): RGB {
  const a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return {
    r: toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  };
}
export const hexToOklch = (hex: string): Oklch => rgbToOklch(hexToRgb(hex));
export const oklchToHex = (L: number, C: number, H: number): string => rgbToHex(oklchToRgb(L, C, H));
export const oklchStr = (L: number, C: number, H: number): string => `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${H.toFixed(1)})`;

function inGamut(L: number, C: number, H: number): boolean {
  const lin = oklchToRgb(L, C, H), e = 0.0005;
  return [lin.r, lin.g, lin.b].every(v => v >= -e && v <= 1 + e);
}
export function maxChroma(L: number, H: number): number {
  let lo = 0, hi = 0.4;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; inGamut(L, mid, H) ? lo = mid : hi = mid; }
  return lo;
}
export function buildScale(hex: string, anchor = false): Stop[] {
  const base = hexToOklch(hex);
  const peakC = Math.max(base.C, 0.085);
  const targets: Record<number, number> = { ...L_TARGET };
  if (anchor) {
    let nearest = STOPS[0], dmin = Infinity;
    for (const s of STOPS) { const d = Math.abs(L_TARGET[s] - base.L); if (d < dmin) { dmin = d; nearest = s; } }
    targets[nearest] = base.L;
  }
  return STOPS.map(s => {
    const L = targets[s];
    const C = Math.min(peakC * C_CURVE[s], maxChroma(L, base.H));
    return { stop: s, hex: oklchToHex(L, C, base.H), L, C, H: base.H };
  });
}
export function relLum(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const f = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrast(a: string, b: string): number {
  const x = relLum(a), y = relLum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export const bestText = (hex: string): string => contrast(hex, '#FFFFFF') >= contrast(hex, '#000000') ? '#FFFFFF' : '#000000';
export function normalizeHex(v: string): string | null {
  v = v.trim(); if (v[0] !== '#') v = '#' + v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) v = '#' + v.slice(1).split('').map(c => c + c).join('');
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : null;
}
export const randomHex = (): string => { const h = Math.random() * 360; return oklchToHex(0.62, Math.min(0.16, maxChroma(0.62, h)), h); };