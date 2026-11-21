function (gc, fromHub, read, write) {
  var K = 'pife_varanda_profile_v3';
  var MAP = { '☕': 'coffee', '🦜': 'toucan', '🦊': 'fox', '🐱': 'cat', '🐶': 'dog', '🎸': 'guitar', '🌻': 'sun', '🧑‍🍳': 'chef',
    '👑': 'crown', '🌵': 'cactus', '🥥': 'coconut', '🦥': 'sloth', '🦉': 'owl', '🐸': 'frog', '🌙': 'moon', '🍀': 'clover' };
  var cur = read(K);
  if (!cur || typeof cur !== 'object') cur = null;
  if (cur && cur.registered && !fromHub) return;
  // Merge: preserva wins/games/matchesWon/theme.
  var next = Object.assign({}, cur || {}, { name: gc.n, registered: true });
  if (gc.p) next.photoDataUrl = gc.p;
  else if (MAP[gc.e]) { next.avatarId = MAP[gc.e]; next.photoDataUrl = null; }
  write(K, next);
}
