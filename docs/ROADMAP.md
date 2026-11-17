# Roadmap e limitações

## Implementado e verificado

- Home, busca de voos (número/data e origem/destino), seleção entre ocorrências, página do voo (status, horários por natureza, timeline, mapa, detalhes, frescor, fonte).
- Cadastro, login, logout, recuperação de senha (link no console em dev), proteção de rotas.
- Acompanhar/deixar de acompanhar, central de alertas com deduplicação, atualização sob demanda e por cron.
- Compartilhamento com validade, opção de ocultar portão, revogação; página pública sem dados pessoais.
- Viagens: CRUD, agrupamento próximas/em andamento/concluídas, busca, workspace com visão geral, roteiro (adicionar, editar, excluir, reordenar, concluir), voos vinculados, orçamento (por moeda e categoria, saldo), bagagem (categorias, modelos, progresso), documentos (metadados + upload privado PDF/PNG/JPEG ≤ 5 MB com verificação de tipo por assinatura).
- Meu Passaporte com filtro por ano, mapa, listas e cartão de retrospectiva (PNG, só agregados).
- Aeroportos: diretório + 12 páginas brasileiras com metadata, sitemap e robots.
- Configurações: nome, tema, aeroporto habitual, preferência de e-mail, exportação de dados (JSON) e exclusão de conta.
- Testes: 58 unitários/integração e 7 jornadas E2E × 2 viewports.

## Pendências reais

1. **Adapter Supabase/Postgres + Supabase Auth** (migrações prontas, código não escrito).
2. **Validar AeroAPI com chave real** e calibrar cache/cron ao custo.
3. **E-mail de alertas** (envio só existe para recuperação de senha; alertas ficam no site).
4. **Internacionalização**: textos estão em pt-BR no código; extrair para catálogos antes de inglês/espanhol.
5. Cache e rate limit distribuídos (Redis) para múltiplas instâncias.
6. Tiles do mapa não puderam ser verificados neste ambiente (rede bloqueada); fallback SVG verificado.
7. Viagens compartilhadas (`trip_members` existe só no esquema).
8. Links oficiais de alguns operadores aeroportuários (CGH, SDU, SSA, REC, FOR, POA, CNF, CWB) não verificados — omitidos de propósito.

## Próximas funcionalidades (só com dados adequados)

- Aeronave anterior, risco de atraso, conexões apertadas, pontualidade histórica, condições aeroportuárias.
- SeuVoo Plus (não exibido como disponível; `subscription_entitlements` pronto).
- Ofertas de hotéis/passagens apenas com parceiro real, preço verificável e identificação de afiliado.
- WhatsApp como canal opcional; PWA.
