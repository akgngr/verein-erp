import "server-only";

// organization modülü — sunucu public girişi (3.4)
// PDF antetleri (shared/pdf/letterhead.tsx) bu veriyi çağıran taraftan alır;
// shared katmanı modül import edemediği için yapı nesnesiyle taşınır (4.2).

export { getOrganizationProfile, type OrganizationProfileData } from "./queries/get-profile";
export { getOrganizationLogoDataUri } from "./services/logo";
export {
  getOrganizationLogoHandler,
  uploadOrganizationLogoHandler,
  deleteOrganizationLogoHandler,
} from "./handlers/logo";
