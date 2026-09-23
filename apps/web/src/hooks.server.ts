import type { Handle } from '@sveltejs/kit';
import { restoreSession } from '$lib/atproto/server/session';
import { isDidBlocked } from '$lib/helpers/moderation';
import { selfhostPlatform } from '$lib/server/selfhost-platform';

export const handle: Handle = async ({ event, resolve }) => {
	// SELF-HOST: Workers alatt a futtatokornyezet adja a `platform.env` bindingokat.
	// Node alatt az adapter-node mar ad egy platformot ({ req }), csak `env` nincs benne,
	// ezert OSSZEFESULUNK (nem cserelunk), kulonben elvesznel a req.
	if (!event.platform?.env) {
		event.platform = { ...(event.platform ?? {}), ...selfhostPlatform() } as App.Platform;
	}
	const customDomain = event.request.headers.get('X-Custom-Domain')?.toLowerCase() || undefined;

	const { session, client, did } = await restoreSession(
		event.cookies,
		event.platform?.env,
		customDomain
	);

	event.locals.session = session;
	event.locals.client = client;
	event.locals.did = did;

	if (isDidBlocked(did)) {
		return new Response('Forbidden', {
			status: 403,
			headers: { 'Cache-Control': 'private, no-store' }
		});
	}

	return resolve(event);
};
