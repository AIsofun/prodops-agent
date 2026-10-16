import type { components } from "./schema.js";

export function validateHealth(value: unknown): value is components["schemas"]["HealthResponse"];
export function validateCapabilities(value: unknown): value is components["schemas"]["CapabilitiesResponse"];
