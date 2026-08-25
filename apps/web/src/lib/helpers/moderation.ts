// Emergency application-level denylist. DIDs remain stable when users change handles.
const BLOCKED_DIDS: ReadonlySet<string> = new Set(['did:plc:2mbicyoe7bckq5rutzedgnks']);

export function isDidBlocked(did: string | null | undefined): boolean {
	return did != null && BLOCKED_DIDS.has(did);
}
