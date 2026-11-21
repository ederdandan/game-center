// Testes da ponte SSO: node --test bridge/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { buildBlock } from './inject.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const GAMES = readdirSync(join(here, 'adapters')).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
const HUB_KEY = 'gc_player_profile';

function scriptFor(game) {
  const block = buildBlock(readFileSync(join(here, 'adapters', game + '.js'), 'utf8'));
  return block.slice(block.indexOf('<script>') + 8, block.lastIndexOf('</script>'));
}

function encode(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Executa a ponte num ambiente falso de navegador.
function run(game, { url = 'https://ederdandan.github.io/' + game + '/', storage = {}, throwingStorage = false } = {}) {
  const store = new Map(Object.entries(storage));
  const u = new URL(url);
  const loc = { pathname: u.pathname, search: u.search, hash: u.hash };
  let replaced = null;
  const localStorage = {
    getItem: k => { if (throwingStorage) throw new Error('blocked'); return store.has(k) ? store.get(k) : null; },
    setItem: (k, v) => { if (throwingStorage) throw new Error('blocked'); store.set(k, String(v)); },
  };
  const window = { localStorage };
  const ctx = {
    window, localStorage, location: loc, atob: s => Buffer.from(s, 'base64').toString('latin1'), TextDecoder,
    history: { state: null, replaceState: (_s, _t, next) => { replaced = next; } },
  };
  vm.runInNewContext(scriptFor(game), ctx);
  return { store: Object.fromEntries(store), replaced, player: window.GC_PLAYER };
}

const HUB = { v: 1, id: 'gc_abc', n: 'Eder', c: '#8a2be2', e: '🦊', ts: 1 };
const PHOTO = 'data:image/jpeg;base64,' + 'A'.repeat(400);

// Perfis já existentes em cada jogo (com stats/ids que nunca podem sumir).
const EXISTING = {
  snake: { serpente_arena_profile_v1: { name: 'Cobra', avatar: { type: 'emoji', value: '🐉' }, extra: 1 } },
  dobro: { sobrecarga2x_profile: { name: 'Dobra', avatar: 'preset:bolt' } },
  pife: { pife_varanda_profile_v3: { name: 'Pifeiro', avatarId: 'owl', photoDataUrl: null, theme: 'x', wins: 7, games: 9, matchesWon: 2, registered: true } },
  'taco-chaos': { taco_chaos_user: { userId: 'usr_keep', name: 'Taco', avatar: '🌮', stats: { matches: 3, wins: 1, slaps: 9 }, loggedIn: true } },
  ludo: { 'ludo:profile': { name: 'Ludista', avatar: '🐼' } },
  adivinha: { 'adv-name': 'Adivinho' },
  murdoku: { murdoku_v2: { profile: { name: 'Inspetor', icon: '🎩', photo: null, createdAt: 5 }, solved: { a: 1 }, theme: 'noir' } },
  'trinca-oculta': { 'trinca-oculta.profiles.v1': { activeId: 'p1', profiles: [{ id: 'p1', name: 'Trinqueiro', avatar: { type: 'emoji', value: '🙂' }, stats: { played: 4, wins: 2, losses: 2, draws: 0 }, createdAt: 1 }] } },
  'olho-vivo': {},
};
const ser = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, JSON.stringify(v)]));

for (const game of GAMES) {
  test(`${game}: acesso direto sem hub não toca em nada`, () => {
    const storage = ser(EXISTING[game]);
    const r = run(game, { storage });
    assert.deepEqual(r.store, storage);
    assert.equal(r.replaced, null);
    assert.equal(r.player, undefined);
  });

  test(`${game}: convite direto (?room= e #sala=) intacto`, () => {
    const storage = ser(EXISTING[game]);
    const r = run(game, { url: `https://ederdandan.github.io/${game}/?room=XYZ#sala=TACO5`, storage });
    assert.deepEqual(r.store, storage);
    assert.equal(r.replaced, null);
  });

  test(`${game}: perfil próprio do jogo é respeitado mesmo com hub salvo`, () => {
    const storage = { ...ser(EXISTING[game]), [HUB_KEY]: JSON.stringify(HUB) };
    const r = run(game, { storage });
    assert.deepEqual(r.store, storage);
    assert.equal(r.player.n, 'Eder');
  });

  test(`${game}: vindo do hub limpa só gc_profile e preserva ?room/#sala`, () => {
    const r = run(game, { url: `https://ederdandan.github.io/${game}/?room=XYZ#sala=AB12&gc_profile=${encode(HUB)}` });
    assert.equal(r.replaced, `/${game}/?room=XYZ#sala=AB12`);
    assert.equal(JSON.parse(r.store[HUB_KEY]).n, 'Eder');
  });

  test(`${game}: payload inválido ou storage bloqueado não quebra`, () => {
    const r = run(game, { url: `https://ederdandan.github.io/${game}/#gc_profile=%%%lixo` });
    assert.equal(r.replaced, `/${game}/`);
    assert.equal(r.store[HUB_KEY], undefined);
    assert.doesNotThrow(() => run(game, { url: `https://ederdandan.github.io/${game}/#gc_profile=${encode(HUB)}`, throwingStorage: true }));
  });
}

test('validação: nome com HTML é limpo, cor e foto inválidas descartadas', () => {
  const evil = { v: 1, id: 'x', n: '<img src=x onerror=alert(1)>Zé', c: 'red;', p: 'data:text/html,oi', e: '"><b>', ts: 1 };
  const r = run('olho-vivo', { url: `https://ederdandan.github.io/olho-vivo/#gc_profile=${encode(evil)}` });
  const p = JSON.parse(r.store[HUB_KEY]);
  assert.ok(!/[<>]/.test(p.n));
  assert.equal(p.c, undefined);
  assert.equal(p.p, undefined);
  assert.equal(p.e, undefined);
});

test('nome com acento e emoji sobrevive ao Base64URL (UTF-8)', () => {
  const r = run('olho-vivo', { url: `https://ederdandan.github.io/olho-vivo/#gc_profile=${encode({ ...HUB, n: 'João 🎮' })}` });
  assert.equal(JSON.parse(r.store[HUB_KEY]).n, 'João 🎮');
});

// Resultados específicos por jogo quando vem do hub (merge, nunca perde stats/ids).
const fromHub = (game, hub = HUB) => run(game, { url: `https://ederdandan.github.io/${game}/#gc_profile=${encode(hub)}`, storage: ser(EXISTING[game]) });
const seed = (game, hub = HUB) => run(game, { storage: { [HUB_KEY]: JSON.stringify(hub) } });
const get = (r, k) => JSON.parse(r.store[k]);

test('snake: merge e semeadura', () => {
  const a = get(fromHub('snake'), 'serpente_arena_profile_v1');
  assert.deepEqual(a, { name: 'Eder', avatar: { type: 'emoji', value: '🦊' }, extra: 1 });
  const b = get(seed('snake', { ...HUB, e: '🎮', p: PHOTO }), 'serpente_arena_profile_v1');
  assert.deepEqual(b.avatar, { type: 'photo', value: PHOTO });
});

test('dobro: mantém preset (emoji não existe no jogo), aceita foto', () => {
  assert.deepEqual(get(fromHub('dobro'), 'sobrecarga2x_profile'), { name: 'Eder', avatar: 'preset:bolt' });
  assert.equal(get(seed('dobro'), 'sobrecarga2x_profile').avatar, 'preset:sun');
  assert.equal(get(seed('dobro', { ...HUB, p: PHOTO }), 'sobrecarga2x_profile').avatar, PHOTO);
});

test('pife: preserva vitórias e tema, mapeia emoji para avatarId', () => {
  const a = get(fromHub('pife'), 'pife_varanda_profile_v3');
  assert.equal(a.wins, 7); assert.equal(a.games, 9); assert.equal(a.theme, 'x');
  assert.equal(a.avatarId, 'fox'); assert.equal(a.name, 'Eder'); assert.equal(a.registered, true);
  const b = get(seed('pife'), 'pife_varanda_profile_v3');
  assert.equal(b.registered, true); assert.equal(b.avatarId, 'fox');
});

test('pife: perfil não registrado (padrão) é semeado no acesso direto', () => {
  const storage = { pife_varanda_profile_v3: JSON.stringify({ name: 'Jogador', registered: false, wins: 1 }), [HUB_KEY]: JSON.stringify(HUB) };
  const p = get(run('pife', { storage }), 'pife_varanda_profile_v3');
  assert.equal(p.name, 'Eder'); assert.equal(p.wins, 1);
});

test('taco-chaos: preserva userId/stats; cria userId e loggedIn na semeadura', () => {
  const a = get(fromHub('taco-chaos'), 'taco_chaos_user');
  assert.equal(a.userId, 'usr_keep'); assert.deepEqual(a.stats, { matches: 3, wins: 1, slaps: 9 }); assert.equal(a.avatar, '🦊');
  const b = get(seed('taco-chaos'), 'taco_chaos_user');
  assert.match(b.userId, /^usr_[a-z0-9]+$/); assert.equal(b.loggedIn, true);
});

test('ludo / adivinha: nome e avatar', () => {
  assert.deepEqual(get(fromHub('ludo'), 'ludo:profile'), { name: 'Eder', avatar: '🦊' });
  assert.equal(get(fromHub('adivinha'), 'adv-name'), 'Eder');
  assert.equal(get(seed('adivinha'), 'adv-name'), 'Eder');
});

test('murdoku: só muda o profile, preserva progresso; respeita migração legada', () => {
  const a = get(fromHub('murdoku'), 'murdoku_v2');
  assert.deepEqual(a.solved, { a: 1 }); assert.equal(a.theme, 'noir');
  assert.equal(a.profile.name, 'Eder'); assert.equal(a.profile.icon, '🦊');
  const keep = get(fromHub('murdoku', { ...HUB, e: '🎮' }), 'murdoku_v2');
  assert.equal(keep.profile.icon, '🎩'); // emoji fora da lista: mantém o ícone do jogo assert.equal(a.profile.createdAt, 5);
  const legacy = { murdoku_pwa_v1: JSON.stringify({ profile: { name: 'Velho' } }), [HUB_KEY]: JSON.stringify(HUB) };
  assert.equal(run('murdoku', { storage: legacy }).store.murdoku_v2, undefined);
});

test('trinca-oculta: reaproveita perfil de mesmo nome, senão cria gc-hub ativo', () => {
  const a = get(fromHub('trinca-oculta'), 'trinca-oculta.profiles.v1');
  assert.equal(a.profiles.length, 2); assert.equal(a.activeId, 'gc-hub'); assert.equal(a.profiles[0].stats.played, 4);
  const b = get(fromHub('trinca-oculta', { ...HUB, n: 'TRINQUEIRO' }), 'trinca-oculta.profiles.v1');
  assert.equal(b.profiles.length, 1); assert.equal(b.activeId, 'p1'); assert.equal(b.profiles[0].stats.wins, 2);
  const c = get(seed('trinca-oculta'), 'trinca-oculta.profiles.v1');
  assert.equal(c.profiles.length, 1); assert.equal(c.activeId, 'gc-hub');
});
