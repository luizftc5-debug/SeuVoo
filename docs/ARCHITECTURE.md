# Arquitetura

Monólito Next.js (App Router). Server Components para leitura, Server Actions para mutações, Route Handlers só onde há resposta não-HTML (arquivos, JSON, imagem, cron). Nenhuma chave de API chega ao cliente.

```
src/
  app/
    (marketing)/        home, /voos, /voos/[id], /aeroportos, institucionais
    (auth)/             /entrar, /cadastro, /recuperar
    app/                área autenticada (/app/...)
    compartilhado/      página pública de link compartilhado
    actions/            Server Actions (validação Zod + autorização)
    api/                documentos, exportação LGPD, cartão do passaporte, busca JSON, cron
  components/
    ui/ aviation/ travel/ maps/ layout/
  lib/                  código puro e testável (datas, moeda, aviação, validações, passaporte)
  server/
    providers/          adapters de dados de voo (demo, aeroapi)
    services/           regras de negócio (flights, tracking, trips, sharing, passport, account)
    db/                 schema + store local
    auth.ts cache.ts rate-limit.ts http.ts storage.ts mail.ts log.ts
  proxy.ts              redirecionamento otimista de /app sem cookie
supabase/migrations/    esquema Postgres com RLS
tests/                  unit/ integration/ e2e/
```

## Fluxo de dados de voo

```
UI ──► services/flights.ts ──► cache (TTL + dedupe em voo) ──► FlightDataProvider (demo | aeroapi)
                                                                     │
                                       normaliza para FlightOccurrence (lib/aviation/types.ts)
```

- Contrato interno independente do provedor: `FlightOccurrence`, `FlightEvent`, `FlightTrack`, `DataSource`, `DataFreshness`.
- `deriveStatus` usa somente flags e horários **efetivos** do provedor; nunca o relógio.
- Instantes em UTC (ISO); exibição com `Intl` no fuso IANA do aeroporto.
- Cache: busca 2 min, voo em andamento 60 s, voo encerrado 30 min. Requisições simultâneas iguais são unificadas.
- `fetchWithRetry`: timeout 8 s, backoff exponencial com jitter só para 429/5xx/rede.
- Erros do provedor viram mensagens que **não** afirmam cancelamento/inexistência.

## Motor de eventos e alertas

`lib/aviation/events.ts` compara o instantâneo anterior com o novo e gera eventos (horário ≥ 5 min, portão, terminal, status, cancelamento, desvio, atraso inicial ≥ 15 min). A `dedupeKey = ocorrência|tipo|valor novo` garante um evento por mudança; notificações são únicas por `(usuário, dedupeKey)`. Instantâneos são atualizados:

1. ao abrir `/app`, `/app/voos` ou `/app/alertas` (voos não encerrados, no máximo a cada 5 min);
2. ao abrir a página de um voo que alguém acompanha;
3. pelo cron `/api/cron/atualizar-voos`.

E-mail está preparado (`server/mail.ts`) mas só envia com provedor configurado. WhatsApp: não implementado; o ponto de extensão é o mesmo laço que cria notificações em `services/tracking.ts`.

## Autenticação e autorização

Modo local: e-mail + senha com scrypt, sessão opaca (32 bytes) em cookie `httpOnly`/`SameSite=Lax`/`Secure`, guardada como SHA-256 (revogável; redefinir senha encerra sessões). `proxy.ts` faz só a checagem otimista; `requireUser()` valida no servidor em todo layout, página e action. Todo serviço de viagem verifica a posse (`ownedTrip`); recursos de outra pessoa retornam “não encontrado”. Rate limit em login, cadastro, recuperação, busca e links compartilhados.

## Persistência

**Implementado:** `server/db/store.ts` — arquivo JSON com escrita atômica e transações serializadas. Serve para desenvolvimento, demonstração e um servidor único com disco persistente. **Não serve** para serverless (Vercel) nem várias instâncias.

**Preparado:** `supabase/migrations/0001_init.sql` com tabelas, índices, restrições, RLS, trigger de perfil e bucket privado de documentos. Os serviços em `server/services/*` são a fronteira: para Supabase, reimplementar as funções de `read/write` por serviço com `@supabase/ssr` (cliente com a sessão do usuário para dados privados, service role apenas para `flight_occurrences`/`flight_events`) e trocar `server/auth.ts` por Supabase Auth mantendo `getCurrentUser/requireUser`. Isso **ainda não foi feito nem testado** contra um projeto Supabase.

## Decisões

- `cacheComponents` desligado: quase tudo depende de sessão ou de dados com frescor explícito; cache fica na camada de serviço.
- Sem estado global no cliente; formulários com `useActionState` + Server Actions (funcionam sem JS nos botões de ação simples).
- MapLibre carregado sob demanda (dynamic import + IntersectionObserver); se o estilo/tiles falharem, cai para esquema SVG. O worker é servido de `/public/vendor` (script `copy-maplibre-worker`).
- Dinheiro em centavos inteiros; sem conversão cambial (moedas diferentes não são somadas).
