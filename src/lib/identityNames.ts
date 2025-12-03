import { IDENTITY_TO_FACTION } from "./staticData";

const CORPORATE_PREFIXES = new Set(["Haas-Bioroid", "Weyland Consortium", "NBN", "Jinteki"]);

export function deriveShortIdentityName(fullName: string) {
  const [prefixRaw, suffixRaw] = fullName.split(":");
  const prefix = prefixRaw?.trim() ?? fullName;
  const suffix = suffixRaw?.trim();
  if (!suffix) {
    return prefix || fullName;
  }
  if (CORPORATE_PREFIXES.has(prefix)) {
    return suffix || prefix;
  }
  return prefix;
}

export const IDENTITY_SHORT_NAMES: Record<string, string> = Object.freeze(
  Object.fromEntries(
    Object.keys(IDENTITY_TO_FACTION).map((name) => [name, deriveShortIdentityName(name)]),
  ),
);

export function getShortIdentityName(fullName: string) {
  return IDENTITY_SHORT_NAMES[fullName] ?? deriveShortIdentityName(fullName);
}
