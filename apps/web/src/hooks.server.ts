import type { Handle } from '@sveltejs/kit';
import { restoreSession } from '$lib/atproto/server/session';
import { isDidBlocked } from '$lib/helpers/moderation';

export const handle: Handle = async ({ event, resolve }) => {
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
