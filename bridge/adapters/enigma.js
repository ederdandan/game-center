function (gc, fromHub, read, write) {
  // Estado único; perfil em state.profile { created, name, avatarType: 'icon'|'image', avatarValue }.
  var K = 'enigma_io_sha256_v2';
  var cur = read(K);
  if (!cur || typeof cur !== 'object') cur = null;
  if (cur && cur.profile && cur.profile.created && !fromHub) return;
  // Só grava o profile (completo: o loadState faz merge raso); moedas/casos/notas/loja ficam.
  var next = Object.assign({}, cur || {});
  next.profile = Object.assign({ avatarType: 'icon', avatarValue: '🕵️' }, (cur && cur.profile) || {}, { created: true, name: gc.n });
  if (gc.p) { next.profile.avatarType = 'image'; next.profile.avatarValue = gc.p; }
  else if (gc.e) { next.profile.avatarType = 'icon'; next.profile.avatarValue = gc.e; }
  write(K, next);
}
