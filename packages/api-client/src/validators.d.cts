import type { components } from "./schema.js";

export function validateHealth(value: unknown): value is components["schemas"]["HealthResponse"];
export function validateCapabilities(value: unknown): value is components["schemas"]["CapabilitiesResponse"];
export function validateRunEvent(value: unknown): value is components["schemas"]["ReservedContracts"]["event"];
export function validateDesktopStartupRequest(value: unknown): value is components["schemas"]["DesktopStartupRequest"];
export function validateDesktopStartupReady(value: unknown): value is components["schemas"]["DesktopStartupReady"];
export function validateDesktopStartupFailure(value: unknown): value is components["schemas"]["DesktopStartupFailure"];
export function validateDesktopStopRequest(value: unknown): value is components["schemas"]["DesktopStopRequest"];
export function validateWorkspaceList(value: unknown): value is components["schemas"]["WorkspaceList"];
