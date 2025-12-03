import type { FactionColourMap, IdentityMap } from "./dataProcessing";
import { FACTION_COLOURS, IDENTITY_TO_FACTION } from "./staticData";
import { createFactionClassMap, type FactionClassMap } from "./statsUtils";

export const IDENTITY_MAP: IdentityMap = new Map(Object.entries(IDENTITY_TO_FACTION));

export const FACTION_COLOUR_MAP: FactionColourMap = new Map(Object.entries(FACTION_COLOURS));

export const FACTION_CLASS_MAP: FactionClassMap = createFactionClassMap(FACTION_COLOURS);
