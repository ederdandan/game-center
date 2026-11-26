# Game Center — contexto do projeto

Hub PWA (GitHub Pages: https://ederdandan.github.io/game-center/) que lista os jogos e dá um login único (SSO) para todos eles.
Especificação completa: `spec.md` (contrato do perfil, RN-06 e tabela de adaptadores na seção 5.4).

- Responder sempre em português do Brasil.
- Os jogos ficam clonados em pastas irmãs: `C:\Users\ederd\estudo\IAs\claudeIA\jogos\<slug>`. Cada um é um repositório `github.com/ederdandan/<slug>`, publicado em `https://ederdandan.github.io/<slug>/`.
- `gh` fica em `"C:\Program Files/GitHub CLI/gh.exe"` (fora do PATH do bash).

## Premissa inegociável

Cada jogo continua 100% jogável sozinho pelo link direto, sem passar pelo hub:
- quem nunca usou o hub não pode notar diferença nenhuma;
- acesso direto a um jogo que já tem perfil não muda nada;
- vindo do hub (`#gc_profile=`), só nome e avatar são atualizados, em merge: nunca apagar moedas, progresso, stats, ids ou tema;
- qualquer erro na ponte = falha silenciosa.

Ajustes dentro do jogo são permitidos desde que não comprometam a integridade dele. Exemplo: fazer o carregamento do estado completar campos ausentes com os padrões quando o jogo quebraria com estado parcial (feito em kakuro e palavra-cruzada).

## Passo a passo: adicionar jogo novo ao hub

1. **Descobrir os jogos novos.** Listar as pastas em `..\` (ignorar `game-center`) e comparar com os `slug` do `games.json`. Toda pasta que não estiver lá é jogo novo.
2. **Analisar cada jogo novo.**
   - Ver `git status`, o remote e um `git pull` na `main`.
   - Ler `index.html` e `sw.js`: título, `theme-color`, descrição, ícones (`icon-512.png`, `icons/icon-512.png` ou `icon.svg`) e se tem modo online (PeerJS/Firebase/WebSocket).
   - Achar a chave do `localStorage` do perfil e o formato dele: nome, avatar (emoji? lista fechada? SVG? foto?), flag de "perfil criado" ou onboarding, e se o jogo completa os padrões ao carregar estado parcial.
3. **Escrever o adaptador** em `bridge/adapters/<slug>.js`, a partir de um parecido:
   - `{ name, avatar }`: `hitori.js`
   - estado único com `.profile`: `wordle-catholic.js`, `runaquest.js`
   - lista fechada de emojis: `pife.js`, `truco.js`
   - flag `created`/`onboarded`: `git-flow-game.js`, `kakuro.js`
   - Regras:
     - acesso direto com perfil próprio → `return`;
     - senão, merge de nome e avatar com `Object.assign({}, cur, …)`;
     - foto do hub (`gc.p`) entra se o jogo aceitar imagem;
     - emoji que o jogo não aceita vira imagem SVG (`emojiImg`) ou é ignorado (lista fechada).
4. **Testes.** Em `bridge/gc-bridge.test.mjs`, adicionar o perfil existente em `EXISTING` e um teste específico do jogo. Rodar `node --test bridge/gc-bridge.test.mjs`; tudo deve passar.
5. **Injetar a ponte:** `node bridge/inject.mjs .. <slug>`, rodando de dentro de `game-center`. É idempotente: põe o bloco `gc-bridge` como primeiro script do `<head>`.
6. **Subir a versão do cache** do service worker do jogo (`sw.js` ou SW inline no `index.html`).
7. **Checar a sintaxe** dos `<script>` inline com `vm.Script` e confirmar que a ponte é o 1º item do `<head>`.
8. **Hub.**
   - Adicionar o jogo no `games.json`: `name`, `slug`, `category` (`cartas`, `tabuleiro`, `party`, `logica` ou `palavras`), `image` relativa (`../<slug>/…`), `color` (theme-color), `desc` curta e `online: true` se houver.
   - Adicionar uma linha na tabela 5.4 do `spec.md` e atualizar a Fase 2 do roadmap.
9. **Publicar.**
   - No jogo: branch `game-center-sso` → commit → push → PR para a `main` → merge com `--delete-branch`. Assim o rollback fica fácil. Se o usuário pedir "direto na main", fazer commit e push na `main`.
   - No hub: commit e push na `main`.
   - Confirmar no ar com `curl` (Pages leva cerca de 40s): o jogo contém `gc-bridge:start` e o `games.json` publicado contém o slug.
10. **Relatar ao usuário** o que entrou, as categorias e qualquer ajuste feito dentro do jogo.

## Hub (arquivos deste repositório)

- `index.html`, `app.js` e `style.css` têm 3 modelos visuais (`data-model`) aguardando a escolha do usuário.
- A cada mudança no shell, subir `VERSION` em `sw.js`. O `games.json` é network-first e não precisa de bump.
