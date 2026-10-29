import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/shared/components/ui/empty-state";
import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { TasksItemForm } from "../components/item-form";
import { getTask, getTaskFormOptions } from "../queries/list-items";

/** Düzenleme çekmecesi (liste sayfasında `?duzenle=<id>`). */
export async function TasksItemEditView({ id }: { id: string }) {
  const [t, item, options] = await Promise.all([
    getTranslations("tasks"),
    getTask(id),
    getTaskFormOptions(),
  ]);

  return (
    <FormDrawer title={t("form.editTitle")} description={item?.title}>
      {item ? (
        <TasksItemForm
          item={item}
          memberOptions={options.memberOptions}
          meetingOptions={options.meetingOptions}
        />
      ) : (
        <EmptyState title={t("errors.notFound")} />
      )}
    </FormDrawer>
  );
}
