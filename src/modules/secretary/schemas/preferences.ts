import { z } from "zod";

/** Kanallar: Pro kanalları (Telegram, SMS …) bu sürümde yok. */
export const SECRETARY_CHANNELS = ["in_app", "email"] as const;
export type SecretaryChannel = (typeof SECRETARY_CHANNELS)[number];

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "secretary.validation.clock");

export const preferencesSchema = z
  .object({
    briefingEnabled: z.boolean(),
    briefingTime: clock,
    quietFrom: clock.nullable(),
    quietTo: clock.nullable(),
    channels: z
      .array(z.enum(SECRETARY_CHANNELS))
      .min(1, "secretary.validation.channels")
      .max(10)
      .transform((channels) => [...new Set(channels)]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.quietFrom === null) !== (value.quietTo === null)) {
      ctx.addIssue({ code: "custom", path: ["quietTo"], message: "secretary.validation.quietPair" });
    } else if (value.quietFrom !== null && value.quietFrom === value.quietTo) {
      ctx.addIssue({ code: "custom", path: ["quietTo"], message: "secretary.validation.quietSame" });
    }
  });

export type PreferencesInput = z.input<typeof preferencesSchema>;
export type Preferences = z.output<typeof preferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  briefingEnabled: true,
  briefingTime: "07:30",
  quietFrom: null,
  quietTo: null,
  channels: ["in_app"],
};
