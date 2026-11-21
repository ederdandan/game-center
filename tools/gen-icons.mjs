// Gera os ícones PNG do PWA sem dependências: node tools/gen-icons.mjs
// Desenho igual ao icons/icon.svg: anel ciano + "play" violeta sobre #0F1117.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const BG = hex('#0F1117'), RING = hex('#00F2FF'), PLAY = hex('#8A2BE2');

// Retorna a cor do ponto (u, v) em [0,1], ou null se fora do ícone.
function shade(u, v, rounded) {
  if (rounded) { // cantos arredondados (raio 22% do lado) para o ícone "any"
    const r = 0.22, cx = Math.min(Math.max(u, r), 1 - r), cy = Math.min(Math.max(v, r), 1 - r);
    if ((u - cx) ** 2 + (v - cy) ** 2 > r * r) return null;
  }
  const d = Math.hypot(u - 0.5, v - 0.5);
  if (Math.abs(d - 0.297) <= 0.0332) return RING;
  // triângulo play: (0.426,0.363) (0.660,0.5) (0.426,0.637)
  if (u >= 0.426 && v >= 0.363 + (u - 0.426) * (0.137 / 0.234) && v <= 0.637 - (u - 0.426) * (0.137 / 0.234)) return PLAY;
  return BG;
}

function png(size, rounded) {
  const SS = 4; // supersampling 4x4 para borda suave
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = shade((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size, rounded);
        if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
      }
      const o = row + 1 + x * 4, n = SS * SS;
      raw[o] = a ? Math.round(r / a) : 0; raw[o + 1] = a ? Math.round(g / a) : 0; raw[o + 2] = a ? Math.round(b / a) : 0; raw[o + 3] = Math.round((a / n) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const out = new URL('../icons/', import.meta.url);
writeFileSync(new URL('icon-192.png', out), png(192, true));
writeFileSync(new URL('icon-512.png', out), png(512, true));
writeFileSync(new URL('icon-maskable-512.png', out), png(512, false)); // fundo cheio: o SO recorta
console.log('ícones gerados em icons/');
