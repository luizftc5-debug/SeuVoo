import type { Metadata } from "next";
import { DeleteAccountForm, PreferencesForm } from "@/components/layout/settings-forms";
import { buttonClass } from "@/components/ui/primitives";
import { signOutAction } from "@/app/actions/auth";
import { requireUser } from "@/server/auth";
import { emailConfigured } from "@/server/mail";
import { getEntitlement } from "@/server/services/account";

export const metadata: Metadata = { title: "Configurações" };

function Block({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-6 border-t border-line py-8 md:grid-cols-[14rem_1fr]"
    >
      <div>
        <h2 id={id} className="font-medium text-ink">
          {title}
        </h2>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      <div className="max-w-lg">{children}</div>
    </section>
  );
}

export default async function Settings() {
  const user = await requireUser("/app/configuracoes");
  const ent = await getEntitlement(user.id);
  const p = user.profile.preferences;
  return (
    <div>
      <h1 className="t-title mb-8">Configurações</h1>
      <Block id="conta" title="Conta" description="E-mail usado para entrar.">
        <p className="text-ink">{user.email}</p>
        <p className="mt-1 text-[13px] text-muted">
          Plano: {ent.plan === "free" ? "Gratuito" : "Plus"}
        </p>
        <form action={signOutAction} className="mt-4">
          <button className={buttonClass("secondary", "sm")}>Sair</button>
        </form>
      </Block>
      <Block id="prefs" title="Preferências" description="Aparência e notificações.">
        <PreferencesForm
          emailAvailable={emailConfigured()}
          defaults={{
            displayName: user.profile.displayName,
            theme: p.theme,
            emailAlerts: p.emailAlerts,
            homeAirport: p.homeAirport,
          }}
        />
      </Block>
      <Block id="privacidade" title="Privacidade e dados" description="Seus direitos pela LGPD.">
        <p className="text-sm text-ink-2">
          Baixe uma cópia em JSON de tudo o que você registrou no SeuVoo.
        </p>
        <a href="/api/conta/exportar" className={buttonClass("secondary", "sm", "mt-3")} download>
          Exportar meus dados
        </a>
      </Block>
      <Block id="excluir" title="Excluir conta" description="Ação definitiva.">
        <p className="mb-4 text-sm text-ink-2">
          Apaga conta, viagens, roteiro, despesas, bagagem, documentos enviados, alertas e links
          compartilhados. Não é possível desfazer.
        </p>
        <DeleteAccountForm />
      </Block>
    </div>
  );
}
