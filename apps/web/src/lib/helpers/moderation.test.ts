import { describe, expect, it } from 'vitest';
import { isDidBlocked } from './moderation';

describe('isDidBlocked', () => {
	it('blocks denylisted DIDs', () => {
		expect(isDidBlocked('did:plc:2mbicyoe7bckq5rutzedgnks')).toBe(true);
	});

	it('allows other and missing DIDs', () => {
		expect(isDidBlocked('did:plc:allowed')).toBe(false);
		expect(isDidBlocked(undefined)).toBe(false);
		expect(isDidBlocked(null)).toBe(false);
	});
});
