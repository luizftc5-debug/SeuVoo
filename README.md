# SeuVoo

**Seu voo, sem surpresas.** Plataforma brasileira de acompanhamento de voos e planejamento de viagens.

- **Aviation Intelligence** — busca por número do voo + data, status normalizado, horários programado/estimado/efetivo no fuso de cada aeroporto, linha do tempo, mapa, motor de alertas com deduplicação, compartilhamento com validade e revogação, orientação ao passageiro (ANAC).
- **Travel Workspace** — viagens com roteiro por dia, voos vinculados, orçamento por categoria/moeda, checklist de bagagem, documentos privados, contagem regressiva e Meu Passaporte.

Next.js 16 (App Router) · React 19 · TypeScript estrito · Tailwind CSS 4 · Zod · MapLibre GL · Vitest · Playwright.

## Começar

Requisitos: Node.js 20.9+ (testado com 22).

```bash
npm install          # também copia o worker do MapLibre para public/vendor
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

Sem nenhuma credencial o projeto roda em **modo demonstração**: dados de voo sintéticos (companhia fictícia `ZZ`, voos `ZZ1001`–`ZZ1010`, sempre marcados como “Demonstração”) e persistência em um arquivo JSON local (`.data/`).

| Experimente | O que mostra |
|---|---|
| `ZZ1002` | atraso (estimado após o programado) + alerta |
| `ZZ1003` | em voo, com decolagem efetiva |
| `ZZ1005` | cancelado + orientação ao passageiro |
| `ZZ1006` | desviado para VCP |
| `ZZ1010` | duas operações no mesmo dia (seleção) |
| `ZZ1004` | internacional GRU→LIS, chegada no dia seguinte em outro fuso |

Datas passadas mostram o desfecho do cenário; datas futuras ficam “Programado”.

## Scripts

| Comando | Ação |
|---|---|
| `npm run dev` | desenvolvimento |
| `npm run build` / `npm start` | build e servidor de produção |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm test` | testes unitários e de integração (Vitest) |
| `npm run test:e2e` | jornadas E2E (Playwright, desktop + mobile). Rode `npm run build` antes |

`next start` em HTTP local: defina `INSECURE_COOKIES=1`, senão o cookie de sessão (marcado `Secure` em produção) não é aceito pelo navegador.

## Configuração

- **Provedor de voos real**: `FLIGHT_DATA_PROVIDER=aeroapi` + `AEROAPI_KEY`. Ver [docs/AVIATION_DATA.md](docs/AVIATION_DATA.md).
- **E-mail** (recuperação de senha, futuros alertas): `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`. Sem isso, em desenvolvimento o link de redefinição aparece no console do servidor.
- **Cron** de atualização de voos acompanhados: `GET /api/cron/atualizar-voos` com `Authorization: Bearer $CRON_SECRET`.
- **Banco**: migrações Postgres/Supabase com RLS em `supabase/migrations/`. O adapter Postgres ainda não foi escrito — ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#persistência).

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [Design System (SVDS)](docs/DESIGN_SYSTEM.md)
- [Dados aeronáuticos](docs/AVIATION_DATA.md)
- [Deploy](docs/DEPLOYMENT.md)
- [Roadmap e limitações](docs/ROADMAP.md)
