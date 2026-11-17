# Deploy

## Opção A — servidor único com disco (funciona hoje)

Qualquer VM/contêiner Node 20+ com volume persistente:

```bash
npm ci
npm run build
SEUVOO_DATA_DIR=/var/lib/seuvoo NEXT_PUBLIC_SITE_URL=https://seu-dominio npm start
```

- Atrás de HTTPS (cookie `Secure`). Não defina `INSECURE_COOKIES` em produção.
- Faça backup de `$SEUVOO_DATA_DIR` (banco JSON + `uploads/`).
- Cron: `curl -H "Authorization: Bearer $CRON_SECRET" https://seu-dominio/api/cron/atualizar-voos` a cada 10–15 min.
- Uma única instância (cache, rate limit e store são em processo).

## Opção B — Vercel + Supabase (alvo)

Requer o adapter Postgres (pendente, ver ARCHITECTURE.md):

1. Criar projeto Supabase; aplicar `supabase/migrations/0001_init.sql` (`supabase db push`).
2. Configurar Auth por e-mail e URL de redirecionamento.
3. Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (apenas servidor), `FLIGHT_DATA_PROVIDER`, `AEROAPI_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`.
4. Vercel Cron em `/api/cron/atualizar-voos`.
5. Trocar cache e rate limit em memória por Redis (ex.: Upstash) mantendo as interfaces de `server/cache.ts` e `server/rate-limit.ts`.

## Checklist

- [ ] `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`
- [ ] Revisão jurídica de `/privacidade`, `/termos` e da orientação ANAC
- [ ] Chave do provedor validada e custo por voo acompanhado estimado
- [ ] Monitoramento de logs (`server/log.ts` emite JSON por linha)
