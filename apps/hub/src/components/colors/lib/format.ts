import { oklchStr, type Stop } from './colors';

export type NamedScale = { name: string; stops: Stop[] };
export type Wrap = (s: string) => string;
export type Tokens = { key: Wrap; val: Wrap; sel: Wrap; cmt: Wrap };

const plain: Tokens = { key: s => s, val: s => s, sel: s => s, cmt: s => s };

export function toTailwindV4(scales: NamedScale[], t: Tokens = plain): string {
  let out = t.sel('@theme') + ' {\n';
  scales.forEach(({ name, stops }) => stops.forEach(c => out += `  ${t.key('--color-' + name + '-' + c.stop)}: ${t.val(oklchStr(c.L, c.C, c.H))};\n`));
  return out + '}';
}
export function toTailwindV3(scales: NamedScale[], t: Tokens = plain): string {
  let out = t.cmt('// tailwind.config.js theme.extend.colors') + '\n{\n';
  scales.forEach(({ name, stops }) => {
    out += `  ${t.key(name)}: {\n`;
    stops.forEach(c => out += `    ${t.key(String(c.stop))}: ${t.val("'" + c.hex.toLowerCase() + "'")},\n`);
    out += '  },\n';
  });
  return out + '}';
}
export function toCss(scales: NamedScale[], t: Tokens = plain): string {
  let out = t.sel(':root') + ' {\n';
  scales.forEach(({ name, stops }) => stops.forEach(c => out += `  ${t.key('--' + name + '-' + c.stop)}: ${t.val(c.hex.toLowerCase())};\n`));
  return out + '}';
}
export function toHexList(scales: NamedScale[], t: Tokens = plain): string {
  return scales.map(({ name, stops }) => t.cmt('// ' + name) + '\n' + stops.map(c => `${t.key(String(c.stop).padEnd(3))}  ${t.val(c.hex.toLowerCase())}`).join('\n')).join('\n\n');
}