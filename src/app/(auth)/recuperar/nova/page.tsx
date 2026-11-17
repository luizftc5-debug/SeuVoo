import type { Metadata } from "next";
import { InlineNotification } from "@/components/ui/primitives";
import { ResetPasswordForm } from "../../forms";

export const metadata: Metadata = {
  title: "Nova senha",
  robots: { index: false },
  referrer: "no-referrer",
};

export default async function NewPasswordPage({ searchParams }: PageProps<"/recuperar/nova">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <>
      <h1 className="t-title">Nova senha</h1>
      <div className="mt-8">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <InlineNotification tone="critical">
            Link incompleto. Peça um novo link de recuperação.
          </InlineNotification>
        )}
      </div>
    </>
  );
}
