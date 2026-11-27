function (gc, fromHub, read, write) {
  // Estado único; perfil em state.profile { created, name, avatarType: 'icon'|'image', avatarValue }.
  // O save v3 tem assinatura da economia (sig): mexer só no profile, que fica fora dela.
  // Sem v3, semeia pelo save legado v2, que o próprio jogo migra (só profile/tema) sem zerar moedas.
  var K3 = 'voidbreach_proto_zero_v3', K2 = 'voidbreach_proto_zero_v2';
  var cur = read(K3), K = K3;
  if (!cur || typeof cur !== 'object') { K = K2; cur = read(K2); }
  if (!cur || typeof cur !== 'object') cur = null;
  if (cur && cur.profile && cur.profile.created && !fromHub) return;
  var next = Object.assign({}, cur || {});
  next.profile = Object.assign({ avatarType: 'icon', avatarValue: '👾' }, (cur && cur.profile) || {}, { created: true, name: gc.n });
  if (gc.p) { next.profile.avatarType = 'image'; next.profile.avatarValue = gc.p; }
  else if (gc.e) { next.profile.avatarType = 'icon'; next.profile.avatarValue = gc.e; }
  write(K, next);
}
