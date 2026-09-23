/**
 * SELF-HOST RÉTEG (nem upstream kód) — Porkoláb Ádám, links.adamporkolab.com
 *
 * A Blento Cloudflare Workers-re készült: a `platform.env` bindingokat a Workers
 * futtatókörnyezet adja. Node (adapter-node) alatt nincs ilyen, ezért itt pótoljuk.
 *
 * Csak azt pótoljuk, amit egy EGYFELHASZNÁLÓS példány tényleg használ:
 *   - OAUTH_SESSIONS / OAUTH_STATES : a bejelentkezéshez KELL, és túl kell élnie
 *                                     az újraindítást, különben minden restart kiléptet
 *   - USER_DATA_CACHE               : opcionális gyorsítótár (a hívó `?.`-ot használ)
 * A CUSTOM_DOMAINS (többbérlős funkció), a DB (D1: cron + xrpc proxy) és az
 * ANALYTICS szándékosan NINCS pótolva — egyfelhasználós self-hoston nem kellenek.
 *
 * A KV-felület, amit a hívók használnak (lásd src/lib/atproto/server/kv-store.ts):
 *   get(key,'text') / put(key,value,{expirationTtl}) / delete(key) / list({cursor})
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

type Row = { v: string; exp: number | null };

/** Fájlra mentett, KVNamespace-kompatibilis tár. Kis adatmennyiség, ritka írás. */
class FileKV {
	#path: string;
	#map = new Map<string, Row>();

	constructor(path: string) {
		this.#path = path;
		mkdirSync(dirname(path), { recursive: true });
		if (existsSync(path)) {
			try {
				this.#map = new Map(Object.entries(JSON.parse(readFileSync(path, 'utf8')) as Record<string, Row>));
			} catch {
				// sérült állomány: üresen indulunk, ez legfeljebb újra-bejelentkezést jelent
			}
		}
	}

	#live(k: string): Row | undefined {
		const r = this.#map.get(k);
		if (!r) return undefined;
		if (r.exp !== null && r.exp <= Date.now()) {
			this.#map.delete(k);
			this.#flush();
			return undefined;
		}
		return r;
	}

	/** atomi írás: tmp + rename, hogy félbeszakadás ne hagyjon csonka fájlt */
	#flush() {
		const tmp = this.#path + '.tmp';
		writeFileSync(tmp, JSON.stringify(Object.fromEntries(this.#map)), { mode: 0o600 });
		renameSync(tmp, this.#path);
	}

	async get(key: string, _type?: string): Promise<string | null> {
		return this.#live(key)?.v ?? null;
	}

	async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
		const ttl = opts?.expirationTtl;
		this.#map.set(key, { v: value, exp: ttl ? Date.now() + ttl * 1000 : null });
		this.#flush();
	}

	async delete(key: string): Promise<void> {
		this.#map.delete(key);
		this.#flush();
	}

	async list(_opts?: { cursor?: string }) {
		for (const k of [...this.#map.keys()]) this.#live(k); // lejártak kitakarítása
		return {
			keys: [...this.#map.keys()].map((name) => ({ name })),
			list_complete: true as const,
			cursor: undefined
		};
	}
}

const STATE_DIR = process.env.BLENTO_STATE_DIR ?? '/var/lib/blento';

let cached: App.Platform | undefined;

export function selfhostPlatform(): App.Platform {
	if (cached) return cached;
	const env = {
		OAUTH_SESSIONS: new FileKV(join(STATE_DIR, 'oauth-sessions.json')),
		OAUTH_STATES: new FileKV(join(STATE_DIR, 'oauth-states.json')),
		USER_DATA_CACHE: new FileKV(join(STATE_DIR, 'user-cache.json')),
		CLIENT_ASSERTION_KEY: process.env.CLIENT_ASSERTION_KEY ?? '',
		COOKIE_SECRET: process.env.COOKIE_SECRET ?? '',
		CRON_SECRET: process.env.CRON_SECRET ?? ''
	} as unknown as App.Platform['env'];

	cached = { env } as unknown as App.Platform;
	return cached;
}
