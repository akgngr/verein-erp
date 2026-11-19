export type SecretaryPreferencesValue = {
  briefingEnabled: boolean;
  briefingTime: string;
  quietFrom: string;
  quietTo: string;
  channels: ("in_app" | "email")[];
};

const clock = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Presentation validation; server API must validate again before storing. */
export function validPreferences(value: SecretaryPreferencesValue): boolean {
  return clock.test(value.briefingTime)
    && ((value.quietFrom === "" && value.quietTo === "") || (clock.test(value.quietFrom) && clock.test(value.quietTo)))
    && value.channels.length > 0
    && value.channels.every((channel) => channel === "in_app" || channel === "email")
    && new Set(value.channels).size === value.channels.length;
}
