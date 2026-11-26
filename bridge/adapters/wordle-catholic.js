function (gc, fromHub, read, write) {
  // Estado único do jogo; perfil em state.profile { name, avatar: { type: 'icon'|'image', value } }.
  var K = 'verbum_catolico_ux_v4';
  // Emoji do hub vira imagem SVG (o jogo só aceita foto data:image ou presets próprios).
  function emojiImg(e) {
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="32" y="47" font-size="42" text-anchor="middle">' + e + '</text></svg>');
  }
  var av = gc.p || (gc.e ? emojiImg(gc.e) : null);
  var cur = read(K);
  if (!cur || typeof cur !== 'object') cur = null;
  if (cur && cur.profile && !fromHub) return;
  var next = Object.assign({}, cur || {});
  next.profile = Object.assign({ avatar: { type: 'icon', value: 'cruz' } }, (cur && cur.profile) || {}, { name: gc.n });
  if (av) next.profile.avatar = { type: 'image', value: av };
  write(K, next);
}
