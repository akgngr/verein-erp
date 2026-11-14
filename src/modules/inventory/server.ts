import "server-only";

export { inventoryPermissions } from "./permissions";
export {
  listInventoryItems,
  listInventoryItemsForExport,
  getInventoryStats,
  getInventoryCategorySummary,
} from "./queries/list-inventory";
export {
  createInventoryAction,
  updateInventoryAction,
  updateInventoryStatusAction,
  deleteInventoryAction,
} from "./actions/inventory-actions";
export { getInventoryAbilities, exportInventoryCsv } from "./services/inventory-service";
// Muhasebe → envanter demirbaş senkronu (muhasebe modülü çağırır).
export { saveItemForAsset, markItemScrapped } from "./services/asset-sync";

export async function getInventorySnapshot(id:string) {
  const {getDb}=await import("@/shared/db");
  return getDb().inventoryItem.findUnique({where:{id},select:{id:true,updatedAt:true}});
}
