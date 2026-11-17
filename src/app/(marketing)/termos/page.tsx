import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Termos de uso" };

export default function Terms() {
  return (
    <Container className="py-10 sm:py-14">
      <article className="max-w-2xl space-y-5 text-ink-2 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink">
        <h1 className="t-title text-ink">Termos de uso</h1>
        <p className="text-sm text-muted">
          Versão de 17/11/2026. Documento informativo; sujeito a revisão jurídica.
        </p>
        <h2>Natureza das informações</h2>
        <p>
          O SeuVoo apresenta dados de terceiros sobre voos. Eles podem estar atrasados, incompletos
          ou incorretos. A fonte oficial sobre o seu voo é sempre a companhia aérea; confirme com
          ela antes de decidir horários de chegada ao aeroporto ou conexões.
        </p>
        <h2>Orientação ao passageiro</h2>
        <p>
          As orientações sobre atrasos e cancelamentos são gerais e não constituem aconselhamento
          jurídico. O SeuVoo não garante indenização ou ressarcimento.
        </p>
        <h2>Independência</h2>
        <p>O SeuVoo não é afiliado a companhias aéreas, operadores de aeroportos ou à ANAC.</p>
        <h2>Uso adequado</h2>
        <p>
          É proibido automatizar consultas em massa, tentar acessar dados de outras pessoas ou
          contornar limites de uso. Podemos limitar ou suspender acessos abusivos.
        </p>
        <h2>Gratuidade</h2>
        <p>
          O serviço é gratuito nesta fase. Recursos pagos, se lançados, terão termos próprios e
          exigirão aceite expresso.
        </p>
      </article>
    </Container>
  );
}
