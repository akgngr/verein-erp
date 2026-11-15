import { taskPrefillFromParams } from "../lib/prefill";
export { taskPrefillFromParams };
import { getTranslations } from "next-intl/server";

import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { TasksItemForm } from "../components/item-form";
import { getTaskFormOptions } from "../queries/list-items";

/** Yeni kayıt çekmecesi (liste sayfasında `?yeni`). Yetki listede denetlenir. */
export async function TasksItemCreateView({ prefill }: { prefill?: { title?: string; description?: string; dueDate?: string } } = {}) {
  const [t, options] = await Promise.all([
    getTranslations("tasks.form"),
    getTaskFormOptions(),
  ]);

  return (
    <FormDrawer title={t("createTitle")}>
      <TasksItemForm
        prefill={prefill}
        memberOptions={options.memberOptions}
        meetingOptions={options.meetingOptions}
      />
    </FormDrawer>
  );
}
