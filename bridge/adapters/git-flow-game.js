function (gc, fromHub, read, write) {
  // Perfil plano { created, name, picType: 'avatar'|'image', picVal, coins, stars, ... }; o jogo completa os padrões.
  var K = 'git_flow_aventura_v1';
  // Emoji do hub vira imagem SVG (o jogo só aceita foto ou os avatares SVG próprios).
  function emojiImg(e) {
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="32" y="47" font-size="42" text-anchor="middle">' + e + '</text></svg>');
  }
  var av = gc.p || (gc.e ? emojiImg(gc.e) : null);
  var cur = read(K);
  if (!cur || typeof cur !== 'object') cur = null;
  if (cur && cur.created && !fromHub) return;
  // Merge: preserva moedas, estrelas, fases e temas.
  var next = Object.assign({}, cur || {}, { name: gc.n, created: true });
  if (av) { next.picType = 'image'; next.picVal = av; }
  write(K, next);
}
