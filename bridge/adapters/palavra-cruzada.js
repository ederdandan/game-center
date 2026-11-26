function (gc, fromHub, read, write) {
  // Estado único do jogo; perfil em state.profile { name, icon (emoji), photo }.
  var K = 'almanaque_letra_pwa_v2';
  var cur = read(K);
  if (!cur || typeof cur !== 'object') cur = null;
  if (cur && cur.profile && !fromHub) return;
  // Só grava o profile; o jogo completa o resto com os padrões ao carregar.
  var next = Object.assign({}, cur || {});
  next.profile = Object.assign({ icon: '📖', photo: null }, (cur && cur.profile) || {}, { name: gc.n });
  if (gc.p) next.profile.photo = gc.p;
  else if (gc.e) { next.profile.icon = gc.e; next.profile.photo = null; }
  write(K, next);
}
