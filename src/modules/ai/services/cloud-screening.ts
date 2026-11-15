import "server-only";

import type { SessionUser } from "@/modules/auth";

import { aliasFor, type AliasResource } from "./aliases";
import { findingKinds, preflightCloudText, type KnownPerson } from "./cloud-preflight";
import { CloudPreflightError } from "./cloud-preflight-error";
import { providerRevision } from "./provider-revision";
import type { AiProviderId } from "./providers/registry";

type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Denetimli bulut modu: son kullanıcı mesajı taranır; kişisel veri bulunursa gönderilmez
 * (CloudPreflightError). Kayıtlı kişiler konuşmanın takma adına çevrilir. Önceki kullanıcı
 * mesajları da her turda yeniden taranır; geçmeyenler bağlamdan çıkarılır. Asistan mesajları
 * zaten takma adlı saklanır.
 */
export async function screenTurnsForCloud(
  args: { user: SessionUser; provider: AiProviderId; conversationId: string; turns: ChatTurn[] },
  loadKnown: () => Promise<KnownPerson[]> = async () => (await import("./known-identifiers")).loadKnownPersons(),
): Promise<ChatTurn[]> {
  const known = await loadKnown();
  const actor = { userId: args.user.id, conversationId: args.conversationId, policyRevision: await providerRevision(args.provider) };
  const aliases = new Map<string, string>();
  const resolveAlias = async (key: string) => {
    const cached = aliases.get(key);
    if (cached) return cached;
    const [resource, id] = key.split(":") as [AliasResource, string];
    const alias = await aliasFor(actor, resource, id);
    aliases.set(key, alias);
    return alias;
  };
  // preflightCloudText senkrondur: önce eşleşen kişileri bul, takma adları üret, sonra yeniden tara.
  const screenOne = async (text: string) => {
    const probe = preflightCloudText(text, known, () => "[[K0]]");
    for (const key of probe.persons) await resolveAlias(key);
    return preflightCloudText(text, known, (key) => aliases.get(key) || "[[K0]]");
  };
  const turns: ChatTurn[] = [];
  for (const [index, turn] of args.turns.entries()) {
    if (turn.role !== "user") {
      turns.push(turn);
      continue;
    }
    const result = await screenOne(turn.content);
    if (result.ok) turns.push({ ...turn, content: result.text });
    else if (index === args.turns.length - 1) throw new CloudPreflightError(findingKinds(result.findings));
  }
  return turns;
}
