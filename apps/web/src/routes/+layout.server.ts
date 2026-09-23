import { env } from '$env/dynamic/private';

export async function load({ request, locals, platform }) {
	const customDomain = request.headers.get('X-Custom-Domain')?.toLowerCase();

	// SELF-HOST: az upstream a profil-linket vagy a Workers-bol jovo X-Custom-Domain
	// fejlecbol, vagy a PDS-beli publication.url-bol veszi. Nalunk egyik sincs (nginx
	// nem kuld ilyen fejlecet, publication rekord pedig nem letezik a repoban), ezert
	// a fallback a `${origin}/${handle}` alakot adta -- es mivel a handle maga is egy
	// domain, ebbol a latszolag relativ https://links.adamporkolab.com/adamporkolab.com
	// lett. A kanonikus URL-t ezert env-bol adjuk at. Ha a publication.url egyszer
	// megszuletik (Blento UI), az elsobbseget elvez -- lasd Profile.svelte.
	return {
		customDomain,
		selfhostProfileUrl: env.SELFHOST_PROFILE_URL || undefined,
		authDid: locals.did
	};
}
