function (gc, fromHub, read, write) {
  // Estado único do jogo; perfil em state.profile { name, avatarType: 'svg'|'image', avatarVal }.
  var K = 'abaco_zen_kakuro_v1';
  // Emoji do hub vira imagem SVG (o jogo só aceita foto data:image ou presets próprios).
  function emojiImg(e) {
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="32" y="47" font-size="42" text-anchor="middle">' + e + '</text></svg>');
  }
  var av = gc.p || (gc.e ? emojiImg(gc.e) : null);
  var cur = read(K);
  if (!cur || typeof cur !== 'object') cur = null;
  if (cur && cur.onboarded && !fromHub) return;
  // Só grava onboarded/profile; o jogo completa o resto com os padrões ao carregar.
  var next = Object.assign({}, cur || {}, { onboarded: true });
  next.profile = Object.assign({ avatarType: 'svg', avatarVal: 'zen1' }, (cur && cur.profile) || {}, { name: gc.n });
  if (av) { next.profile.avatarType = 'image'; next.profile.avatarVal = av; }
  write(K, next);
}
