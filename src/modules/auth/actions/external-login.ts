"use server";

import { cookies } from "next/headers";
import { signIn } from "../auth";
import { loadEnabledAuthProviders } from "../services/oauth-providers";

export async function externalLogin(form: FormData) {
  const id = form.get("provider");
  if (typeof id !== "string" || !(await loadEnabledAuthProviders()).ids.includes(id)) return;
  // Ordinary login must not accidentally complete a previously abandoned linking flow.
  (await cookies()).delete("verein-oauth-link");
  await signIn(id, { redirectTo: "/" });
}
