// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleAuthProviders } from "@/shared/auth/providers";

import { authProviders as socialloginAuthProviders } from "@/modules/social-login/auth-providers";

/** Giriş sağlayıcıları (OAuth/OIDC) sunan modüller (src/modules/<modül>/auth-providers.ts, #612). Yalnız sunucu. */
export const moduleAuthProviderRegistry: ModuleAuthProviders[] = [
  socialloginAuthProviders,
];
