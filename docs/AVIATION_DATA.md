# Dados aeronáuticos

## Provedores

| Provedor | Estado | Observações |
|---|---|---|
| Demonstração (`demo`) | **Funcionando** | Companhia fictícia ZZ; cenários determinísticos; sem posição/trajetória. |
| FlightAware AeroAPI (`aeroapi`) | **Implementado, não validado ao vivo** | Sem chave neste ambiente. Normalização coberta por teste com payload no formato documentado. |
| ANAC / SIROS | Não integrado | Malha programada; útil para validar existência de voos regulares, sem posição em tempo real. |
| Cirium FlightStats | Não integrado | Alternativa comercial; criar `server/providers/cirium.ts` implementando `FlightDataProvider`. |

Trocar de provedor é só configuração: `FLIGHT_DATA_PROVIDER=aeroapi` e `AEROAPI_KEY=...`. Os componentes consomem apenas `FlightOccurrence`.

## AeroAPI — endpoints usados

| Uso | Endpoint |
|---|---|
| Busca por designador | `GET /flights/{ident}?ident_type=designator&start&end` (janela UTC que cobre o dia local) |
| Detalhe | `GET /flights/{fa_flight_id}?ident_type=fa_flight_id` |
| Trajetória | `GET /flights/{fa_flight_id}/track` (altitude em centenas de pés → convertida) |
| Rota | `GET /airports/{origem}/flights/to/{destino}` |
| Painel do aeroporto | `GET /airports/{id}/flights/scheduled_departures` / `scheduled_arrivals` |

Antes de produção: confirmar campos e cotas com a conta contratada, ajustar o TTL de cache ao custo por consulta e definir o intervalo do cron (cada atualização de voo acompanhado é uma chamada paga).

## Regras de normalização

- Status vem de sinais explícitos: `cancelled`, `diverted`, `actual_in` → chegou, `actual_on` → pousou, `actual_off` → em voo, `actual_out` → saiu do portão; “atrasado” só se o estimado de partida passar ≥ 15 min do programado.
- Horários estimados nunca são exibidos como efetivos; a interface rotula cada horário.
- Sem trajetória do provedor, o mapa desenha apenas a ortodrômica entre aeroportos, com legenda “ligação ilustrativa”.
- Distância “linha reta entre aeroportos” (haversine); tempo em voo só com horários efetivos.

## Mapas

MapLibre GL + estilo OpenFreeMap (dados © OpenStreetMap, ODbL; atribuição exibida pelo controle do mapa). Trocar com `NEXT_PUBLIC_MAP_STYLE_URL`. Neste ambiente de desenvolvimento o host de tiles estava bloqueado pela rede; foi verificado apenas o fallback SVG.

## Regras da ANAC

A orientação ao passageiro (`components/aviation/passenger-guidance.tsx`) separa detectado / não confirmado / ações gerais / fontes oficiais / análise individual. A Resolução ANAC nº 400/2016 teve revisão aprovada em setembro de 2026; por isso o texto **não cita prazos nem garante direitos** e remete ao portal da ANAC. Revisar o conteúdo quando o texto consolidado for publicado (data de revisão em `GUIDANCE_REVIEWED_AT`).
