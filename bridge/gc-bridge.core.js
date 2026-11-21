/* Game Center SSO bridge v1 — fonte: game-center/bridge/ (não editar no jogo; rode bridge/inject.mjs) */
(function (adapt) {
  try {
    var HUB_KEY = 'gc_player_profile';
    var MARK = 'gc_profile=';
    var ls = window.localStorage;

    // Valida e normaliza o perfil do hub. Qualquer campo inválido é descartado.
    function valid(p) {
      if (!p || typeof p !== 'object' || p.v !== 1) return null;
      var n = String(p.n == null ? '' : p.n).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);
      if (n.length < 2) return null;
      var out = { v: 1, id: String(p.id || '').slice(0, 64), n: n, ts: Number(p.ts) || 0 };
      if (typeof p.e === 'string' && p.e.length > 0 && p.e.length <= 16 && !/[<>"'&]/.test(p.e)) out.e = p.e;
      if (typeof p.c === 'string' && /^#[0-9a-fA-F]{6}$/.test(p.c)) out.c = p.c;
      if (typeof p.p === 'string' && p.p.length <= 12000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p.p)) out.p = p.p;
      return out;
    }

    function decode(s) {
      s = s.replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      var bin = atob(s);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes));
    }

    function read(k) {
      try { return JSON.parse(ls.getItem(k)); } catch (e) { return null; }
    }

    function write(k, v) {
      try { ls.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    }

    // 1. Hash vindo do hub: lê, valida e remove SÓ o trecho gc_profile=
    //    (preserva ?room=, #sala= e qualquer outro fragmento; replaceState não dispara hashchange).
    var fromHub = null;
    var hash = location.hash;
    if (hash.indexOf(MARK) >= 0) {
      var keep = [];
      hash.slice(1).split('&').forEach(function (part) {
        if (part.indexOf(MARK) === 0) {
          try { fromHub = valid(decode(part.slice(MARK.length))); } catch (e) { fromHub = null; }
        } else if (part) {
          keep.push(part);
        }
      });
      try {
        history.replaceState(history.state, '', location.pathname + location.search + (keep.length ? '#' + keep.join('&') : ''));
      } catch (e) {}
      if (fromHub) write(HUB_KEY, fromHub);
    }

    // 2. Perfil do hub: o recém-chegado ou o salvo (mesma origem ederdandan.github.io).
    var gc = fromHub || valid(read(HUB_KEY));
    if (!gc) return; // nunca usou o hub: jogo segue 100% como antes
    window.GC_PLAYER = gc;

    // 3. Adaptador do jogo. Regra: veio do hub → atualiza nome/avatar (merge);
    //    acesso direto → só semeia se o jogo ainda não tem perfil. Nunca apaga stats/ids.
    if (adapt) adapt(gc, !!fromHub, read, write);
  } catch (e) { /* falha silenciosa: o jogo segue normal */ }
})(__GC_ADAPTER__);
