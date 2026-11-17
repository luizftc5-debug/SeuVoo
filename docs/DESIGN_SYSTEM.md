# SVDS — SeuVoo Design System

Premium editorial, minimalismo funcional, precisão aeronáutica. Tokens em `src/app/globals.css`; primitivas em `src/components/ui`.

## Cor (tokens semânticos)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `canvas` | #F8F9F7 | #0E151B | fundo |
| `surface` | #FFFFFF | #141D25 | superfícies |
| `subtle` | #F0F2EF | #19242D | hover, skeleton |
| `ink` / `ink-2` | #17212B / #3A4650 | #E5EBEE / #C3CDD3 | texto |
| `muted` | #5F6B75 | #93A1AB | texto secundário (≥ 4,5:1 sobre canvas) |
| `line` / `line-strong` | #E2E7E5 / #C9D1CE | #23303A / #33424D | divisores, bordas de campo |
| `navy` | #152C3D | #0A1720 | faixa de destaque |
| `accent` | #326D75 | #79B8BF | links, ação, “em voo” |
| `positive` | #2F7055 | #79C39D | chegou, concluído |
| `warning` / `warning-mark` | #8F5C22 / #B77A35 | #E0AD6C | texto de atraso / marcadores |
| `critical` | #A8413B | #EC958F | cancelado, desviado, erro |

`warning` para texto foi escurecido em relação a #B77A35 para atingir contraste AA; o tom original fica em `warning-mark` (pontos, bordas). Tema: “sistema” por padrão; escolha da conta em Configurações, aplicada antes da pintura via `localStorage`.

## Tipografia

Duas famílias: **Instrument Sans** (interface e títulos) e **IBM Plex Mono** (dados: horários, números de voo, códigos IATA, valores), via `next/font` (auto-hospedadas, `display: swap`). Utilitários: `t-display`, `t-title`, `t-heading`, `t-label`, `t-data` (`tabular-nums`).

## Forma e movimento

Raios 4/6/10 px. Sombras só em elementos flutuantes. Movimento: `animate-enter` (240 ms) em conteúdo novo, transições de cor de 150 ms; `prefers-reduced-motion` zera animações.

## Componentes

`FlightSummary`, `FlightStatus`, `FlightTimeline`, `AirportIdentifier`, `RouteLine`, `TimeStack` (horário + natureza do dado + programado riscado), `FlightRow`, `FreshnessNote`, `FlightSearch`, `SharePanel`, `PassengerGuidance`, `MapView/FlightMap`, `TripForm`, seções do workspace, `SectionHeader`, `EmptyState`, `InlineNotification`, `DemoTag`, `Disclosure`, `SubmitButton`.

## Regras

- A forma segue a função: tabelas para horários e despesas, listas para sequências, linha do tempo para eventos; cards só quando agrupam um objeto (um voo, uma viagem).
- Cor de status tem significado fixo; nada de chips decorativos.
- Todo dado sintético leva `DemoTag`. Nenhum rótulo “ao vivo”.
- Campo indisponível aparece como “Não informado pela fonte”, nunca inventado.
