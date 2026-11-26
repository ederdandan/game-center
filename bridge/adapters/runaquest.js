function (gc, fromHub, read, write) {
  // Estado único; perfil em state.profile { created, name, avatarType: 'icon'|'image', avatarValue }.
  var K = 'runaquest_floating_islands_v1';
  var cur = read(K);
  if (!cur || typeof cur !== 'object') cur = null;
  if (cur && cur.profile && cur.profile.created && !fromHub) return;
  // Só grava o profile (completo: o jogo troca o objeto inteiro); fases/moedas/heróis ficam.
  var next = Object.assign({}, cur || {});
  next.profile = Object.assign({ avatarType: 'icon', avatarValue: '🦊' }, (cur && cur.profile) || {}, { created: true, name: gc.n });
  if (gc.p) { next.profile.avatarType = 'image'; next.profile.avatarValue = gc.p; }
  else if (gc.e) { next.profile.avatarType = 'icon'; next.profile.avatarValue = gc.e; }
  write(K, next);
}
