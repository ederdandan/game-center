# Especificação de Negócio e Funcional — Game Center PWA (`ederdandan.github.io`)

**Versão:** 1.1 (SSO revisado: localStorage compartilhado + ponte por jogo)  
**Autor / Proprietário:** EderDandan (`https://ederdandan.github.io/`)  
**Direção Visual Validada:** Modelo 1 — *Arcade Lounge* (Dark Mode & Neon Sutil)  
**Plataforma Alvo:** Web Desktop e Mobile (PWA instalável via GitHub Pages)

---

## 1. Visão Geral e Objetivo de Negócio

### 1.1 Problema
Atualmente, existem múltiplos jogos web independentes publicados individualmente no GitHub Pages (ex.: `adivinha`, `dobro`, `ludo`, `murdoku`, `olho-vivo`, `pife`, `snake`, `taco-chaos`, `trinca-oculta`). Cada título opera de forma apartada, exigindo que o jogador informe novamente seu apelido/identidade em cada aplicação e dificultando a descoberta centralizada do portfólio.

### 1.2 Solução Proposta
Criar o **`game-center`**, um hub/portal PWA estático hospedado no GitHub Pages que:
1. **Cataloga e agrupa** todos os jogos por categoria em uma única vitrine responsiva.
2. **Centraliza a identidade do jogador (SSO Leve / Client-Side Handoff)** em um primeiro acesso rápido e repassa automaticamente essas credenciais para qualquer jogo aberto a partir do hub, sem quebrar o funcionamento autônomo ou os links diretos de sala (`?room=...`) dos jogos individuais.
3. **Permite expansão sem atrito**: novos jogos podem ser adicionados ao catálogo informando apenas **nome** e **link** (ou slug), com geração automática de URL (`https://ederdandan.github.io/{nomejogo}`) e capa visual de fallback.
4. **Mantém cada jogo 100% jogável sozinho**: sem o hub, nenhum jogo muda de comportamento (ver RN-03 e 5.4).

### 1.3 Objetivos Principais
* **Fricção Zero no Primeiro Acesso:** Permitir visualizar o catálogo imediatamente e configurar apelido/avatar em menos de 15 segundos.
* **Manutenção Simplificada:** Gerenciar todo o catálogo por meio de um arquivo declarativo (`games.json`), sem precisar alterar HTML ou lógica de código a cada novo lançamento.
* **Compatibilidade Multiplataforma:** Experiência fluida tanto em navegadores desktop quanto instalado na tela inicial de smartphones (Android/iOS) como PWA.
* **Independência dos Jogos Filhos:** Nenhum jogo depende obrigatoriamente do `game-center` para rodar; convites diretos de partida multiplayer continuam funcionando normalmente.

---

## 2. Escopo Funcional

### 2.1 Requisitos Funcionais (RF)

| ID | Requisito | Descrição Detalhada |
| :--- | :--- | :--- |
| **RF-01** | **Catálogo Declarativo (`games.json`)** | O portal deve carregar a lista de categorias e jogos a partir de `./games.json`. Caso um jogo possua apenas `name` e `url` (ou apenas `name`), o sistema deve preencher valores padrão automaticamente (`slug`, `category = "outros"` com label *Outros* mesmo sem estar declarada em `categories`, capa fallback). Campo `slug` explícito é opcional, para quando o nome do repositório não bate com o nome normalizado. |
| **RF-02** | **Agrupamento por Categorias** | Na visão padrão (*Todos*), os jogos devem ser exibidos agrupados em seções por categoria (ex.: *Jogos de Cartas*, *Jogos de Tabuleiro*, *Party & Reflexo*, *Lógica & Arcade*), com contador de títulos por grupo. |
| **RF-03** | **Filtros e Busca Instantânea** | Barra superior com chips/pílulas clicáveis de categorias (*Todos* + categorias cadastradas) e campo de busca em tempo real por nome do jogo. |
| **RF-04** | **Card de Jogo com Capa e Fallback** | Cada card deve exibir: imagem de capa (`image`) quando informada, título do jogo, slug/badge e botão de ação **JOGAR**. Se `image` estiver ausente ou falhar ao carregar, exibir automaticamente uma capa estilizada com iniciais e gradiente neon derivado do hash do nome. |
| **RF-05** | **Perfil Único do Jogador (Login Leve)** | Modal de configuração de perfil contendo: `nickname` (2 a **12** caracteres — menor limite entre os jogos), cor de destaque, emoji ou foto enviada pelo usuário (redimensionada via `<canvas>` para 96×96px em JPEG, data URL com no máximo 12.000 caracteres) e `playerId` único (`crypto.randomUUID()`) persistido no `localStorage` (`gc_player_profile`, contrato 5.3). |
| **RF-06** | **Repasse de Sessão (SSO via URL Hash)** | Todos os jogos estão na mesma origem (`https://ederdandan.github.io`), então o canal principal é o próprio `localStorage.gc_player_profile`. Ao clicar em **JOGAR**, o hub abre o jogo em nova aba (`_blank`) e anexa `#gc_profile={payload Base64URL}` à URL. Isso marca que o jogador veio do hub e cobre o PWA instalado no iOS, cujo armazenamento é separado do Safari. |
| **RF-07** | **Recepção nos Jogos Individuais** | Cada jogo tem a **ponte SSO** (5.4) como primeiro `<script>` do `<head>`, executada antes do código do jogo. Ela lê `#gc_profile=`, remove **só** esse trecho via `history.replaceState` (preserva `?room=`, `#sala=` e demais fragmentos) e repassa o perfil ao formato próprio do jogo por meio de um adaptador. |
| **RF-08** | **Continuar Jogando (Histórico Local)** | Registrar os últimos jogos abertos pelo usuário no `localStorage` do hub para exibir uma faixa rápida *"Continuar Jogando"* no topo do catálogo. |
| **RF-09** | **Assistente "+ Adicionar Jogo"** | Ferramenta auxiliar (opcional/admin local) que permite preencher *Nome*, *Link/Slug*, *Categoria* e *URL da Imagem*, pré-visualizar o card e copiar o bloco JSON pronto para colar no `games.json`. |
| **RF-10** | **Suporte PWA (Web + Mobile)** | Fornecer `manifest.webmanifest` (`display: "standalone"`, ícones 192×192 e 512×512) e `sw.js` (Service Worker) para instalação no dispositivo e carregamento rápido. |

---

## 3. Regras de Negócio (RN)

* **RN-01 — Padrão de URL dos Jogos:** Quando não for informada uma URL completa (`http://` ou `https://`), o link do jogo deve ser derivado automaticamente no formato `https://ederdandan.github.io/{slug}`, onde `{slug}` é o nome do jogo normalizado (sem acentos, minúsculo e espaços substituídos por hífen `-`).
* **RN-02 — Origem Compartilhada:** Todos os repositórios rodam na **mesma origem** (`ederdandan.github.io`), logo compartilham o mesmo `localStorage`. Cada jogo mantém prefixo próprio nas chaves (já é assim hoje: `ludo:*`, `pife_varanda_*`, `taco_chaos_*` etc.). A chave `gc_player_profile` é reservada ao hub. O transporte por URL usa **fragmento (`#gc_profile=`)**, nunca query string, para não interferir em salas P2P nem em cache de CDN.
* **RN-03 — Convites Diretos de Sala:** Se um jogador acessar diretamente um link de convite de partida (ex.: `https://ederdandan.github.io/ludo/?room=XYZ`) sem nunca ter passado pelo `game-center`, o jogo deve permitir jogar normalmente (usando perfil local previamente salvo ou solicitando apelido rápido no próprio jogo). No acesso direto, a ponte nunca sobrescreve um perfil existente do jogo. Ela só pré-preenche quando o jogo ainda não tem perfil e o jogador já configurou um no hub.
* **RN-06 — Merge, nunca substituição:** Ao aplicar o perfil do hub, a ponte altera só nome e avatar. Estatísticas, IDs, temas e progresso dos jogos são preservados. Regra do avatar: usa a foto do hub se o jogo aceita foto; senão, o emoji do hub se ele existe na lista do jogo; senão, mantém o avatar atual do jogo.
* **RN-04 — Atualização de Catálogo sem Cache Preso:** No Service Worker (`sw.js`), os arquivos estáticos do shell (`index.html`, `style.css`, `app.js`) podem usar estratégia *Cache-First* com versionamento de cache, mas o arquivo `games.json` deve usar estratégia ***Network-First*** (com fallback para cache) para que novos jogos adicionados apareçam imediatamente aos usuários.
* **RN-05 — Abertura em Tela Cheia / Nova Aba:** Os jogos devem ser abertos em nova aba/janela (`window.open(..., '_blank', 'noopener,noreferrer')`) em vez de `<iframe>` embutido, garantindo largura total no mobile, evitando bloqueios de teclado/áudio/câmera e preservando o compartilhamento nativo de links de sala.

---

## 4. Diretrizes de UX e Design System (Modelo 1: Arcade Lounge)

### 4.1 Identidade Visual
* **Tema:** Dark Mode imersivo inspirado em consoles e plataformas gamer modernas.
* **Paleta de Cores:**
  * Fundo principal (`--bg-app`): `#0F1117`
  * Superfície de cards (`--bg-card`): `#1A1D27` (hover: `#222634`)
  * Texto principal: `#E2E8F0`
  * Texto secundário: `#94A3B8`
  * Destaque primário (Neon Cyan): `#00F2FF`
  * Destaque secundário / Botão Jogar (Violeta): `#8A2BE2`
* **Tipografia:** `Inter` (pesos 400 a 900) com títulos em caixa alta nas seções de categoria e badges em fonte monoespaçada para slugs/IDs.

### 4.2 Ergonomia Desktop vs. Mobile (PWA)
* **Header Fixo:** Logo `GAME CENTER` à esquerda, busca centralizada (ou logo abaixo do topo no mobile) e **Credencial do Jogador** (avatar + apelido + indicador de edição) à direita.
* **Barra de Categorias:** Faixa horizontal com rolagem suave (`overflow-x: auto`, scrollbar oculta) e chips com borda luminosa ciano no item ativo.
* **Grid Responsivo:**
  * Desktop: 3 a 4 colunas (`grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))`).
  * Mobile (`<= 768px`): 1 coluna ampla (ou 2 compactas), botões com área de toque mínima de `44px` e respeito a `100dvh` / *safe areas*.

---

## 5. Arquitetura Técnica e Estrutura de Arquivos

### 5.1 Estrutura da Pasta `game-center/`
```text
game-center/
├── index.html            # Estrutura semântica, header, filtros, grid e modais
├── style.css             # Design system Arcade Lounge + responsividade PWA
├── app.js                # Carregamento de games.json, normalização, filtros e SSO
├── games.json            # Base declarativa de categorias e jogos
├── manifest.webmanifest  # Metadados PWA (nome, ícones, standalone, theme_color)
├── sw.js                 # Service Worker (cache do shell + network-first no JSON)
└── covers/               # (Opcional) Imagens/capas locais dos jogos (.png/.webp)
```

### 5.2 Contrato de Dados — `games.json`
```json
{
  "categories": [
    { "id": "cartas", "label": "Jogos de Cartas" },
    { "id": "tabuleiro", "label": "Jogos de Tabuleiro" },
    { "id": "party", "label": "Party & Reflexo" },
    { "id": "logica", "label": "Lógica & Arcade" }
  ],
  "games": [
    {
      "name": "Pife",
      "url": "https://ederdandan.github.io/pife",
      "image": "./covers/pife.png",
      "category": "cartas"
    },
    {
      "name": "Trinca Oculta",
      "category": "cartas"
    },
    {
      "name": "Dobro",
      "category": "cartas"
    },
    {
      "name": "Ludo",
      "category": "tabuleiro"
    },
    {
      "name": "Olho Vivo",
      "category": "party"
    },
    {
      "name": "Taco Chaos",
      "category": "party"
    },
    {
      "name": "Murdoku",
      "category": "logica"
    },
    {
      "name": "Snake",
      "category": "logica"
    },
    {
      "name": "Adivinha",
      "category": "logica"
    }
  ]
}
```

### 5.3 Contrato de Transporte SSO (`#gc_profile=`)
* **Origem:** `game-center` serializa o objeto do jogador em UTF-8 → Base64URL:
  ```json
  {
    "v": 1,
    "id": "6f1c2c9e-…",
    "n": "EderDandan",
    "c": "#8a2be2",
    "e": "🎮",
    "p": "data:image/jpeg;base64,…",
    "ts": 1730000000000
  }
  ```
* **Campos:** `v` versão do contrato (1); `n` nome (2–12 caracteres, sem `<>` nem caracteres de controle); `c` cor `#RRGGBB`; `e` emoji (até 16 caracteres); `p` foto opcional (JPEG data URL com até 12.000 caracteres); `ts` epoch em ms. A ponte descarta campos inválidos.
* **Destino:** a ponte salva em `gc_player_profile`, expõe `window.GC_PLAYER` e chama o adaptador do jogo antes de ele montar a tela inicial ou entrar em salas.

### 5.4 Ponte SSO (`game-center/bridge/`)
* `gc-bridge.core.js` — núcleo idêntico em todos os jogos (validação, leitura do hash, limpeza da URL, `try/catch` silencioso).
* `adapters/<jogo>.js` — traduz o perfil do hub para a chave e o formato de cada jogo.
* `inject.mjs` — injeta ou atualiza o bloco `<!-- gc-bridge:start -->…<!-- gc-bridge:end -->` logo após `<head>` em cada `index.html` (idempotente). Depois de rodar, suba a versão do cache no `sw.js` do jogo.
* `gc-bridge.test.mjs` — `node --test bridge/gc-bridge.test.mjs`.

| Situação | Comportamento da ponte |
| :--- | :--- |
| Nunca usou o hub | Não faz nada. |
| Convite direto (`?room=`, `#sala=`) | Não toca na URL nem no storage. |
| Acesso direto, jogo já tem perfil | Não faz nada. |
| Acesso direto, jogo sem perfil, hub configurado | Pré-preenche o perfil do jogo. |
| Veio do hub (`#gc_profile=`) | Atualiza nome/avatar no perfil do jogo (merge, RN-06). |
| Qualquer erro | Falha silenciosa; o jogo segue normal. |

| Jogo | Chave | Observação do adaptador |
| :--- | :--- | :--- |
| adivinha | `adv-name` | Só nome (base: branch `main`). |
| dobro | `sobrecarga2x_profile` | Avatares são presets SVG: só a foto do hub é aproveitada. |
| git-flow-game | `git_flow_aventura_v1` | Perfil plano com `created`; avatar vira `picType: 'image'` (foto ou emoji em SVG). |
| ludo | `ludo:profile` | Aceita qualquer emoji ou foto JPEG. |
| murdoku | `murdoku_v2` (`.profile`) | Não semeia se só existir o legado `murdoku_pwa_v1` (a migração é do próprio jogo). |
| olho-vivo | — | Sem perfil: a ponte só limpa o hash e expõe `GC_PLAYER`. |
| pife | `pife_varanda_profile_v3` | Emoji mapeado para `avatarId`; marca `registered: true`. |
| runaquest | `runaquest_floating_islands_v1` (`.profile`) | Grava o `profile` completo (`created: true`); emoji direto em `avatarValue`. |
| enigma | `enigma_io_sha256_v2` (`.profile`) | Igual ao runaquest: grava o `profile` completo (`created: true`); emoji direto em `avatarValue`, foto como `image`. |
| snake | `serpente_arena_profile_v1` | Lista fechada de 12 emojis. |
| taco-chaos | `taco_chaos_user` | Cria `userId` se faltar; marca `loggedIn: true`. |
| trinca-oculta | `trinca-oculta.profiles.v1` | Multi-perfil: reaproveita o de mesmo nome ou cria/atualiza `gc-hub` e o ativa. |
| truco | `truco_raiz_profile_v1` | Emoji mapeado para `avatarId` (lista de 8); o perfil padrão "Violeiro" sem partidas conta como sem perfil. |
| bandit | `fuga_cela_profile_v1` | `{ name, avatar }`; emoji do hub vira imagem SVG (`data:image/svg+xml`). |
| hitori | `monolito_hitori_profile_v1` | Igual ao bandit. |
| kakuro | `abaco_zen_kakuro_v1` (`.profile`) | Estado único: grava só `profile` e `onboarded: true`; o jogo completa o resto com os padrões. |
| murdle | `dossie_noir_profile_v2` | Igual ao bandit. |
| pacman | `eclipse_maze_profile_v1` | `{ nickname, avatar }`; avatar sempre URL de imagem. |
| palavra-cruzada | `almanaque_letra_pwa_v2` (`.profile`) | Estado único: emoji direto em `icon`, foto em `photo`; o jogo completa o resto com os padrões. |
| soroban | `soroban_mestre_profile_v1` | Igual ao bandit. |
| wordle-catholic | `verbum_catolico_ux_v4` (`.profile`) | Avatar `{ type: 'image', value }` (foto ou emoji em SVG). |

---

## 6. Roadmap de Evolução (Próximos Passos)

1. **Fase 1 — Entrega dos Arquivos Base de Produção:** ✅ Entregue com 3 modelos visuais para validação (1 · Arcade Lounge, 2 · Vitrine, 3 · Mesa de Jogos), trocáveis pelo seletor flutuante ou por `?modelo=N`. Depois da escolha, remover o seletor e o CSS dos modelos descartados. Ícones gerados por `tools/gen-icons.mjs`. A cada mudança no shell, subir `VERSION` em `sw.js`. Arquivos: `index.html`, `style.css`, `app.js`, `games.json`, `manifest.webmanifest` e `sw.js` finais para publicação em `https://ederdandan.github.io/game-center/`.
2. **Fase 2 — Integração nos Repositórios dos Jogos:** ✅ Ponte SSO (5.4) na `main` dos 9 jogos originais (`adivinha`, `dobro`, `ludo`, `murdoku`, `olho-vivo`, `pife`, `snake`, `taco-chaos`, `trinca-oculta`). Lote 2 mergeado via PR: `bandit`, `hitori`, `kakuro`, `murdle`, `pacman`, `palavra-cruzada`, `soroban`, `wordle-catholic` (na `main`). `truco` direto na `main`. Lote 3 via PR: `git-flow-game`, `runaquest`. Lote 4 via PR: `enigma`.
3. **Fase 3 — Assets Visuais:** Adicionar screenshots/capas reais na pasta `game-center/covers/` e ícones PWA (`icon-192.png` e `icon-512.png`).
4. **Fase 4 — Melhorias Futuras (Opcional):**
   * Botão *"Voltar ao Game Center"* discreto dentro de cada jogo.
   * Favoritar jogos no topo do hub.
   * Sincronização opcional em nuvem (Supabase/Firebase) caso deseje compartilhar perfil entre dispositivos diferentes.

---

## 7. Prompt de Retomada para Próxima Sessão
> *"Use a especificação `spec.md` como referência. Vamos gerar os arquivos finais de produção do PWA (`index.html`, `style.css`, `app.js`, `games.json`, `manifest.webmanifest` e `sw.js`) no visual Modelo 1 (Arcade Lounge) prontos para subir no repositório `ederdandan.github.io/game-center`."*