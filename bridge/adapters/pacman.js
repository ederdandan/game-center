function (gc, fromHub, read, write) {
  // Perfil { nickname, avatar }; avatar é sempre URL de imagem (<img src>).
  var K = 'eclipse_maze_profile_v1';
  // Emoji do hub vira imagem SVG (o jogo só aceita foto data:image ou presets próprios).
  function emojiImg(e) {
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="32" y="47" font-size="42" text-anchor="middle">' + e + '</text></svg>');
  }
  var av = gc.p || (gc.e ? emojiImg(gc.e) : null);
  var cur = read(K);
  if (!cur || typeof cur !== 'object') cur = null;
  if (cur && cur.nickname && cur.avatar && !fromHub) return;
  var next = Object.assign({}, cur || {}, { nickname: gc.n });
  if (av) next.avatar = av;
  write(K, next);
}
