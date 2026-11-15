import "server-only";

import { defineLifecycle } from "@/shared/modules/lifecycle";

import {deleteGenerationsOfOwner} from "./services/generation";
import { deleteFilesOfOwner } from "./services/files";

/** Kullanıcı silinince "Dosyalarım" kayıtları ve diskteki dosyaları silinir. */
export const lifecycle = defineLifecycle({
  moduleKey: "exports",
  onUserDeleted: async (userId) => {
    await deleteGenerationsOfOwner(userId);
    await deleteFilesOfOwner(userId);
  },
});
