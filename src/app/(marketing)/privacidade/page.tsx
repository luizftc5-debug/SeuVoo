import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function Privacy() {
  return (
    <Container className="py-10 sm:py-14">
      <article className="max-w-2xl space-y-5 text-ink-2 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink">
        <h1 className="t-title text-ink">Política de privacidade</h1>
        <p className="text-sm text-muted">
          Versão de 17/11/2026. Documento informativo da versão inicial do produto; deve ser
          revisado por assessoria jurídica antes do lançamento comercial.
        </p>
        <h2>O que coletamos</h2>
        <p>
          Nome de exibição, e-mail e senha (guardada apenas como hash) para a conta; os voos que
          você acompanha; as viagens, atividades, despesas, itens de bagagem e documentos que você
          registra; e preferências. Buscas de voo sem login não são associadas a uma pessoa. O
          histórico de buscas recentes fica só no seu navegador.
        </p>
        <h2>Para que usamos</h2>
        <p>
          Exclusivamente para prestar o serviço: mostrar seus voos e viagens, detectar mudanças e
          gerar alertas. Não vendemos dados e não usamos seus dados para publicidade.
        </p>
        <h2>Minimização (LGPD)</h2>
        <p>
          Não pedimos número de passaporte, CPF ou dados de reserva para cadastrar uma viagem.
          Documentos enviados ficam em armazenamento privado, acessíveis apenas pela sua sessão, e
          nunca por endereço público permanente.
        </p>
        <h2>Compartilhamento</h2>
        <p>
          Links de acompanhamento que você cria mostram apenas dados operacionais do voo. Consultas
          a provedores de dados de voo enviam o número e a data do voo — nunca seus dados pessoais.
        </p>
        <h2>Seus direitos</h2>
        <p>
          Em Configurações você pode exportar seus dados e excluir sua conta de forma definitiva, o
          que remove viagens, documentos, alertas e links compartilhados.
        </p>
        <h2>Cookies</h2>
        <p>Usamos um único cookie essencial de sessão, sem rastreamento de terceiros.</p>
      </article>
    </Container>
  );
}
