function (gc, fromHub, read, write) {
  // Perfil { name, avatarId, photoDataUrl, theme, wins, games, muted }; avatar é lista fechada.
  var K = 'truco_raiz_profile_v1';
  var MAP = { '🤠': 'cowboy', '🐓': 'rooster', '🪕': 'guitar', '🐂': 'bull', '🍻': 'beer', '🌵': 'cactus', '🔥': 'fire', '👑': 'crown' };
  var cur = read(K);
  if (!cur || typeof cur !== 'object') cur = null;
  // O jogo salva o perfil padrão "Violeiro" ao mudar tema/som: só ele conta como "sem perfil".
  var own = cur && cur.name && !(cur.name === 'Violeiro' && !cur.photoDataUrl && !Number(cur.games));
  if (own && !fromHub) return;
  // Merge: preserva wins/games/theme/muted.
  var next = Object.assign({}, cur || {}, { name: gc.n });
  if (gc.p) next.photoDataUrl = gc.p;
  else if (MAP[gc.e]) { next.avatarId = MAP[gc.e]; next.photoDataUrl = null; }
  write(K, next);
}
