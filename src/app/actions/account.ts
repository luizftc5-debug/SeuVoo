"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { destroySession, requireUser } from "@/server/auth";
import { deleteAccount, updateProfile } from "@/server/services/account";
import { fieldErrors, preferencesSchema, type FormState } from "@/lib/validations";

export async function savePreferencesAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = preferencesSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { displayName, ...prefs } = parsed.data;
  await updateProfile(user.id, displayName, prefs);
  revalidatePath("/app", "layout");
  return { ok: true, message: "Preferências salvas.", values: { theme: prefs.theme } };
}

export async function deleteAccountAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (
    String(fd.get("confirm") ?? "")
      .trim()
      .toLowerCase() !== user.email
  )
    return { fieldErrors: { confirm: "Digite seu e-mail exatamente para confirmar." } };
  await deleteAccount(user.id);
  await destroySession();
  redirect("/?conta=excluida");
}
