// Injeta (ou atualiza) a ponte SSO do Game Center no index.html de cada jogo.
// Uso: node bridge/inject.mjs [pastaDosJogos] [jogo1 jogo2 ...]
// Padrão: pasta irmã do game-center, todos os jogos com adaptador em bridge/adapters/.
// Depois de rodar, suba a versão do cache no sw.js de cada jogo alterado.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const gamesDir = resolve(process.argv[2] || join(here, '..', '..'));
const only = process.argv.slice(3);
const core = readFileSync(join(here, 'gc-bridge.core.js'), 'utf8').trim();
const START = '<!-- gc-bridge:start -->';
const END = '<!-- gc-bridge:end -->';

export function buildBlock(adapterSrc, eol = '\n') {
  const script = core.replace('__GC_ADAPTER__', () => adapterSrc.trim());
  return [START, '<script>', script, '</script>', END].join('\n').replace(/\r?\n/g, eol);
}

export function injectInto(html, block) {
  const s = html.indexOf(START);
  if (s >= 0) {
    const e = html.indexOf(END, s);
    if (e < 0) throw new Error('marcador gc-bridge:end ausente');
    return html.slice(0, s) + block + html.slice(e + END.length);
  }
  const m = html.match(/<head[^>]*>(\r?\n)?/i);
  if (!m) throw new Error('<head> não encontrado');
  const eol = m[1] || '\n';
  const at = m.index + m[0].length;
  return html.slice(0, at) + block + eol + html.slice(at);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const adapters = readdirSync(join(here, 'adapters')).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
  for (const game of only.length ? only : adapters) {
    const file = join(gamesDir, game, 'index.html');
    if (!existsSync(file)) { console.log(`- ${game}: index.html não encontrado, pulando`); continue; }
    const html = readFileSync(file, 'utf8');
    const eol = html.includes('\r\n') ? '\r\n' : '\n';
    const block = buildBlock(readFileSync(join(here, 'adapters', game + '.js'), 'utf8'), eol);
    const out = injectInto(html, block);
    if (out === html) { console.log(`= ${game}: sem mudança`); continue; }
    writeFileSync(file, out, 'utf8');
    console.log(`+ ${game}: ponte ${html.includes(START) ? 'atualizada' : 'injetada'}`);
  }
}
