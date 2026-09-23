# Self-host jegyzetek — links.adamporkolab.com

Ez a fork a `flo-bit/blento` **Cloudflare Workers**-re írt kódját futtatja
**Node alatt, saját szerveren**, nginx mögött. Az upstream self-host doksi
(`docs/Selfhosting.md`) csak Cloudflare Workert ír le; Docker-támogatás nincs.

## Amit megváltoztattam (összesen 3 forrásfájl)

| fájl | változás | miért |
|---|---|---|
| `apps/web/svelte.config.js` | `adapter-cloudflare` → `adapter-node` | saját szerveren futunk |
| `apps/web/src/lib/server/selfhost-platform.ts` | **új** | a Workers `platform.env` bindingjainak pótlása |
| `apps/web/src/hooks.server.ts` | 6 sor: a platform **összefésülése** | ezen át kapja meg az app a pótolt bindingokat |
| `apps/web/package.json` | `@sveltejs/adapter-node` devDependency | — |

## A buktató, amibe belefutottam

Az `adapter-node` **maga is beállítja** az `event.platform`-ot `{ req }`-re.
Ezért a kézenfekvő `if (!event.platform) event.platform = …` **soha nem fut le**,
és az OAuth-végpontok némán 500-at adnak („CLIENT_ASSERTION_KEY secret is not set"),
holott a változó be van állítva. Helyesen **össze kell fésülni**, nem cserélni:

```ts
if (!event.platform?.env) {
    event.platform = { ...(event.platform ?? {}), ...selfhostPlatform() } as App.Platform;
}
```

## Amit NEM pótoltam (és miért nem baj)

| binding | mire kell | egyfelhasználós self-hoston |
|---|---|---|
| `OAUTH_SESSIONS`, `OAUTH_STATES` | bejelentkezés | **pótolva** (fájlra mentve, `/var/lib/blento`) |
| `USER_DATA_CACHE` | gyorsítótár | pótolva (opcionális, a hívó `?.`-ot használ) |
| `CUSTOM_DOMAINS` | többbérlős egyedi domain | nem kell |
| `DB` (D1) | contrail-index: `/api/cron`, `/xrpc/*` proxy | nem kell — a betöltő PDS-ről is olvas |
| `ANALYTICS` | Cloudflare Analytics Engine | nem kell |

A `DB`-t használó két route (`src/routes/api/cron`, `src/routes/xrpc/[...path]`)
`platform!.env.DB`-t ír, tehát **hibára futna, ha meghívnák** — a nyilvános oldal
és a szerkesztő nem hívja őket.

## Üzemeltetés

```
systemctl {status,restart} blento      # /etc/systemd/system/blento.service
/etc/blento.env                        # titkok + PUBLIC_* (600 root:root)
/var/lib/blento/                       # OAuth-sessionök, cache (fájlra mentve)
/etc/nginx/sites-available/links.adamporkolab.conf
/opt/node22/bin/node                   # kulon Node 22 (a rendszeré 20 maradt)
```

Újrafordítás upstream-szinkron után:

```bash
cd ~/blento && git pull
export PATH=/opt/node22/bin:$PATH
pnpm install --no-frozen-lockfile
cd apps/web && NODE_OPTIONS='--max-old-space-size=4096' pnpm exec vite build
sudo systemctl restart blento
```

Ha az upstream hozzányúl a `hooks.server.ts`-hez vagy a `svelte.config.js`-hez,
a merge ott fog ütközni — a fenti táblázat alapján gyorsan helyreállítható.

## Ismert korlátok

- A `githubProfile` kártya `GITHUB_TOKEN`-t igényel (a Bento eredetileg
  contributions-grafikont mutatott a GitHub-csempén; itt sima link van helyette).
- Az upstream szerző jelenleg **nem javasolja** a self-hostot: „some features/cards
  may break". Ütközés esetén szinkronizálni kell.

## 2026-09-23 — jogi oldalak, footer, profil-link

**Miért:** az upstream `/imprint` és `/privacy` oldala **Florian Killiust** (a blento.app
üzemeltetőjét) nevezi meg. A `links.adamporkolab.com` az én domainem, ott ez az adat hamis.

| változás | fájl |
|---|---|
| `/imprint` és `/privacy` route törölve | `src/routes/(legal)/{imprint,privacy}/+page.svelte` |
| footer „Imprint · Privacy" blokk kivéve (a „made with blento" credit MARAD) | `src/lib/website/view/MadeWithBlento.svelte` |
| kanonikus profil-URL átadása | `src/routes/+layout.server.ts` |
| profil-link: a self-host URL a handle-fallback ELŐTT | `src/lib/website/view/Profile.svelte` |
| `SELFHOST_PROFILE_URL=https://adamporkolab.com` | `/etc/blento.env` |

**A profil-link hibája (nem elírás, hanem szerkezeti):** az upstream a linket vagy a
Workers által küldött `X-Custom-Domain` fejlécből, vagy a PDS-beli `publication.url`-ből
veszi. Self-hoston **egyik sincs** — az nginx nem küld ilyen fejlécet, és a repóban
(`did:plc:cx3gq3ppj3t53jtwrhy4duvz`) nincs publication rekord, csak `app.blento.card`.
Ezért a `${origin}/${handle}` fallback futott, és mivel a handle MAGA IS egy domain
(`adamporkolab.com`), az eredmény látszólag relatív link lett:
`https://links.adamporkolab.com/adamporkolab.com`. A `publication.url` továbbra is
ELSŐBBSÉGET élvez, ha egyszer megszületik a Blento UI-ból.

**MÉG NYITOTT — `/terms`:** ugyanúgy Florian Killiust nevezi meg, és továbbra is 200-at ad
(a footerből nem hivatkozott, csak közvetlen URL-lel érhető el). Nem törlődött, mert a
feladat kifejezetten az imprint+privacy párost nevezte meg.

**Build-buktató:** a `pnpm build` a Vite-fázis UTÁN `contrail append-scheduled`-et futtat,
ami a Cloudflare-worker bundle-t keresi (`.svelte-kit/cloudflare/_worker.js`). Nálunk
adapter-node van, tehát ez MINDIG hibára fut és a `pnpm build` **exit 1**-et ad, holott a
build sikeres. A helyes ellenőrzés a `✔ done` sor és a friss `build/index.js`, nem a kilépőkód.
