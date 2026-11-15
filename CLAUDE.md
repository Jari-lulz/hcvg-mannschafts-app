# HCVG Mannschafts-App

Mannschafts-App für die weibliche D- und C-Jugend des HC Vorpommern-Greifswald (Saison 2026/27, BHV Ost).

- Name: „Mannschafts-App“. Adresse: https://jari-lulz.github.io/hcvg-mannschafts-app/ (Repo `Jari-lulz/hcvg-mannschafts-app`, bis 11/2026 `hcvg-eltern-app`). Der lokale Ordner heißt noch `hcvg-eltern-app`. Kalender-UIDs (`@hcvg-eltern-app`) nicht ändern, sonst entstehen doppelte Termine.

## Aufbau
- `index.html`: die App (HTML, CSS, JS in einer Datei, keine Build-Tools).
- `data.js`: Spieldaten, **automatisch erzeugt** von `tools/update-data.ps1`. Nicht von Hand bearbeiten.
  - `window.HCVG_DATA = { updated, leagues: { D, C }, halls }`
  - je Liga: `table`, `games`, `reports`
  - Spielzeile: `[Datum, Uhrzeit, Hallen-ID, Heim, Gast, Ergebnis, Notiz, Bericht-ID, angesetzter Schiri]`
  - Bericht (Cache `tools/cache/<id>.v2.json`): `{ ht, sr[], h, a, ev[] }`. `ev` = `[Sekunde, Seite, Code, Rückennummer]` – über die Nummer wird jedes Tor der Werferin zugeordnet (Torphasen, Halbzeiten, Steckbriefe im Gegner-Check).
- Alt: `h`/`a` = `{ p: [[Nr, Name, PersonID, Tore, 7mTore, 7mVersuche, Gelb, 2Min, Disq]], s7, g7, m2, y, d, to }`. `ev` = `[Sekunde, Seite(1 Heim/2 Gast), Code]` mit Code `g`, `7g`, `7x`, `y`, `2`, `d`, `t`.
- Von Hand gepflegt in `index.html`: `SHORT` (Kurznamen), `LEN` (Spielzeit je Liga).
- Trainingszeiten: `tools/training.json` (einzige Stelle, gilt für App und Kalender). `from`/`until` = Zeitraum der wöchentlichen Kalender-Serien. Nach Änderung: Skript laufen lassen oder einfach pushen (der Workflow läuft bei jedem Push).
- Hallen mit Adresse: `tools/halls.json` (einzige Liste). Das Skript schreibt sie als `hallInfo` nach `data.js`, die App liest sie von dort (`HALLS`). Neue Halle = Eintrag dort ergänzen.
- Kalender-Abos: `kalender.ics` (beide), `kalender-c.ics`, `kalender-d.ics`, erzeugt vom Skript bei jedem Lauf. Termin = Treff (1 Std. vor Anwurf) bis ca. 40 Min. nach Spielende, mit Halle, Adresse und Google-Maps-Link. Dazu die Trainings als wöchentliche Serientermine (Zuordnung je Tag aus `training.json`; bei Jugend `X` in beiden Kalendern). Kachel „Spiele in deinen Kalender“ auf der Startseite (webcal-Link fürs iPhone, Google-Kalender-Link, Adresse kopieren).
- Eigenes Team: `US = "HC Vorpommern-Greifswald"`.

## Daten aktualisieren
```
powershell -ExecutionPolicy Bypass -File tools\update-data.ps1
```
- Läuft mit Windows PowerShell 5.1 und PowerShell 7.
- Genehmigte Spielberichte werden in `tools/cache/` gespeichert und nicht erneut geladen.
- Namen werden schon im Skript gekürzt („Vorname N.“), weil es um Kinder geht.
- In der App zeigt `pName()` unsere Spielerinnen nur mit erstem Vornamen („Annie Lea L.“ → „Annie“). Kommt ein Vorname in beiden Jugenden zusammen mehrfach vor, bleibt das Kürzel („Leni W.“ / „Leni G.“). Andere Teams bleiben „Vorname N.“.

## Datenquellen (nuLiga HVMV)
- wJD Bezirksoberliga: group=486919
- wJC Bezirksoberliga: group=486898
- Tabelle: `.../groupPage?championship=BHV+Ost+26%2F27&group=<id>`
- Gesamtspielplan: `...&displayTyp=vorrunde&displayDetail=meetings`
- Spielbericht: `.../groupMeetingReport?meeting=<id>&championship=...&group=<id>`
- Live-Ticker: `https://hbde-live.liga.nu/nuScoreLive/#/groups/<id>`. Wird verlinkt (Knopf „Live“). Die REST-API (`/nuScoreLiveRestBackend/api/1/`) erlaubt keinen Zugriff aus dem Browser von fremden Seiten (CORS), nur serverseitig (GitHub Actions).
- **Fast-live Spielstand:** `update-data.ps1` holt pro Liga `.../api/1/meetings/<group>/time/<unix-sekunden auf 15 s gerundet>` und speichert unsere Spiele ±3 Tage als `leagues[k].live = [[Heim, Gast, Anwurf UTC ISO, Tore H, Tore G, live, HZ H, HZ G]]`. Der Workflow läuft dafür Sa/So zur Spielzeit alle 10 Minuten. GitHub hält die 10 Minuten nicht ein (real oft 40–60 Min.).
- **Echtes Live (seit 15.11.2026): Cloudflare Worker** `worker/live.js` (kostenloser Plan, Konto des Users, Adresse https://hcvg-live.hcvg-mannschaft.workers.dev/ = `LIVE_URL` in `index.html`). Holt beide Ligen von nuScore, nur unsere Spiele ±3 Tage, plus Spielsekunde aus der Ereignisliste (9. Feld), 15 s Cache, CORS nur für jari-lulz.github.io und localhost:8801. Die App fragt im Spielfenster alle 30 s den Worker und alle 2 Min. `data.js` (Ergebnis/Spielbericht); fällt der Worker aus, nur `data.js`. Hochladen: im Ordner `worker` `npx wrangler@4 deploy` (Anmeldung per `npx wrangler@4 login`, User klickt Allow).
- handball.net (geprüft 11/2026): Vereinsseite `/club/0e22k3j` zeigt keine Teams, die API (`/api/new/...`) antwortet mit 403. Keine zusätzlichen Daten.

## Startseite
- Reihenfolge: Banner (Teamfoto, antippen = Kader), beide Spielkarten (Reihenfolge `cardOrder`/`cardRank`: wer heute spielt, steht oben und leuchtet gelb umrandet, Klasse `hot`; sonst C vor D), Kuchen-Alarm, Capri-Sonne-Alarm, „App teilen“, Trainingszeiten, Kalender-Kachel.
- **Erster Bildschirm (`.fold`, `sizeFold()`):** Banner + beide Karten füllen am Handy (≤600 px breit) genau den ersten Bildschirm, Kuchen-Alarm beginnt darunter. Höhe wird einmal gemessen (nicht bei Adressleisten-Resize). Bei hohen Fenstern (Opera, Chrome) wachsen Foto (begrenzt, `max-height:min(46vw,260px)`) und Karten (`justify-content:space-evenly`) statt einer Lücke. Am PC kein Strecken. **Bei jeder Änderung an den Karten in mehreren Höhen testen (z. B. 740/820/880/1000 px).**
- **Spielkarte (`nextCard`, `cardGame`, `cardState`, `liveFor`):** Das Spiel der laufenden Woche bleibt bis Sonntag 23:59 stehen, danach das nächste. Vor Anwurf: Treff (Anwurf − 1 h) und Anwurf. Ab Anwurf ersetzt eine Spielstand-Zeile in **gleicher Höhe** die Treff/Anwurf-Zeile: rot „● LIVE 12 : 9 · Halbzeit 8:6“, ohne Live-Daten „Spiel läuft · Spielstand folgt“, danach gelb „Endstand 24 : 17 · Sieg“. **Endstand nur, wenn sicher vorbei:** nuLiga trägt schon während des Spiels einen vorläufigen Stand ein (z. B. „0:0“) – als Ergebnis zählt er erst mit Spielbericht-ID (`resFinal`, sonst `g.prov`) oder 6 Std. nach Anwurf. Aus nuScore gilt „Endstand“ erst, wenn der Datenstand (`DATA.updated`) nach Spielzeit + 10 Min. Pause liegt und der Ticker nicht mehr live ist; vorher „Spiel läuft · Stand HH:MM“ bzw. „Letzter Stand von HH:MM · Endstand folgt“. Spielzeit: `LEN` (D 2×20, C 2×25), `PAUSE` = 10. Während eines Spiels holt die App alle 30 s den Live-Stand vom Cloudflare-Worker und alle 2 Min. `data.js` und tauscht nur die Karten (`refreshLive`, `redrawCards`). Live-Zeile zeigt die Spielminute. Knöpfe: Route, Live, Gegner-Check, Teilen (Einladung als WhatsApp-Text: Datum, Anwurf, Treff, Halle, Route – ohne App-Link, ohne Liveticker).
- **Route-Link (`mapsDest`/`mapsUrl`, im Skript `MapsLink`):** Adresse mit Hausnummer → nur Adresse; ohne Hausnummer → Hallenname + Adresse.
- **„App teilen“ (`shareAppTile`):** teilt den App-Link mit kurzem Text (navigator.share, sonst wa.me).
- Ergebnisse, Tabellen und Statistik stehen in den Reitern D-Jugend und C-Jugend.
- Gelbe Karten und Zeitstrafen sind bei Jugendspielen anonym, also nur pro Mannschaft verfügbar.

## Reiter
- Start, D-Jugend (Spiele/Statistik), C-Jugend (Spiele/Statistik), Analyse.
- Analyse hat drei Bereiche: Unser Team, Gegner-Check, Liga. Gegner-Check und Liga lassen sich mit `FEATURE_GEGNER` / `FEATURE_LIGA = false` in `index.html` wieder ausblenden (dann verschwindet auch der Knopf „Gegner-Check“ auf den Spielkarten).
- Gegner-Check (`viewOpponent`): Gegner des Spiels der Startseiten-Karte (`cardGame`), bleibt also auch während/nach dem Spiel bis Sonntag 23:59 stehen („Gegner dieser Woche“), danach nächster echter Gegner. Zahlenvergleich, Schlüsselspielerinnen (Anteil an den Toren), 7m-Schützin, automatische Hinweise („Worauf achten?“), direkter Vergleich und gemeinsame Gegner.
- Liga (`viewLigaAna`): meiste Tore, bester Schnitt, sicherste 7m, Schlüsselspielerin je Team, Auffälligkeiten. Filter „Nur HC VG“.
- Unser Team (`analyse(k)` in `index.html`): feste Regeln, keine Live-KI. Vergleicht HC VG mit der Liga (Angriff, Abwehr, 7m, Strafen, Halbzeiten, erste/letzte 10 Minuten, Torverteilung, enge Spiele) und leitet daraus Stärken, Baustellen und bis zu 3 Trainingsschwerpunkte ab. Nur Mannschaftsebene, keine Kritik an einzelnen Kindern.

## Kuchen-Regel (Startseite)
- Wer in einem Spiel das 30. Mannschaftstor für uns wirft, bringt zum nächsten Training Kuchen mit.
- Die Werferin steht nicht im nuLiga-Bericht. `Get-Scorer30` im Skript liest sie aus der nuScore-Ereignisliste (`.../nuScoreLiveRestBackend/api/1/events/<Bericht-ID>`, Code 4 = Tor, 5 = 7m-Tor, mit Spielstand und Name). Ergebnis: `leagues[k].cake = { Bericht-ID: "Vorname N." }`, zwischengespeichert in `tools/cache/cake-<id>.txt`.
- Startseite (`cakeTile()`): immer eine kleine Zeile „Kuchen-Alarm · 30. Tor“. Gelb mit Namen, wenn im letzten Spiel einer Jugend das 30. Tor fiel und das Spiel höchstens 10 Tage her ist (`CAKE_FRESH_DAYS`), je fällige Jugend eine eigene Kachel mit Schild „C-Jugend“/„D-Jugend“ (also bis zu zwei). Sonst eine Kachel „Noch frei!“ mit Spruch (`CAKE_EMPTY`). Alle Sprüche (`CAKE_LINES`, `CAKE_EMPTY`, `CAPRI_LINES`, `CAPRI_EMPTY`) wechseln bei jedem Öffnen zufällig (`pickLine`), C- und D-Kachel verschieden. **In Sprüchen keine Gedankenstriche** (Wunsch des Users).
- Statistik je Jugend: „Kuchen- & Capri-Chronik“ mit allen bisherigen 30. und 40. Toren.
- **Capri-Sonne-Alarm:** gleiches Prinzip für das 40. Tor (10er-Träger Capri-Sonne). `leagues[k].capri`, Cache `tools/cache/capri-<id>.txt`, `capriTile()`, orange.

## Weitere Funktionen
- Trainingszeiten: Jugend `X` in `training.json` = wechselt; dann keine Jugend-Schilder, sondern Hinweis „Welche Jugend trainiert? Steht im WhatsApp-Channel der Mannschaft“ (kein WhatsApp-Link!). Im Kalender in beiden Jugend-Kalendern als „Training C-/D-Jugend“.
- Ergebnisse: Spiel antippen → Halbzeit, Schiris, Spielverlauf-Grafik, **Spieleinschätzung** (`gameNotes`: „👍 Das lief gut“ / „💪 Daran arbeiten wir“, je max. 3 Punkte, nur aus nuLiga-Daten, nur unsere Spiele), Torschützinnen.
- Kader (Banner antippen, `viewKader`): Torhüterinnen zuerst (`KEEPERS`, von Hand: D Larissa L., Frieda D.; C Marleen K. → „🧤 Torhüterin · Hält das Team im Spiel“), danach aufsteigend nach Anzahl Spiele. Sonst „Torgefährlich in Minute X bis Y“.
- Animationen: Einblenden, Banner-Wörter, Countdown-Puls, Kuchen wackelt, Capri hüpft, Teilen-Ring, Balken wachsen, Spielverlauf zeichnet sich, Kader/Tabelle laufen ein. Alles aus bei `prefers-reduced-motion`.
- Hell/Dunkel-Schalter (`hcvg-theme` in localStorage), `color-scheme: light dark` gegen erzwungenen Dunkelmodus (Samsung).
- Link-Vorschau (Open Graph, `img/vorschau.jpg`), Startbildschirm-Name „HC Vorpommern-Greifswald“ (`manifest.webmanifest`).

## Workflow (GitHub Actions, `.github/workflows/update.yml`)
- Sa/So 7:00–7:30 halbstündlich, Sa 8–19 und So 8–18 alle 10 Min., Sa abends halbstündlich bis 21:30, Mi 18:00, plus bei jedem Push. Committet `data.js`, `tools/cache`, `*.ics`; deployt `_site` (hängt `?v=RUN_ID` an `data.js`).

## Arbeitsweise mit dem User
- Antworten auf Deutsch, kurz und einfach (User ist nicht technisch). Vor größeren Änderungen fragt er manchmal erst nach Einschätzung: dann nichts ändern, nur antworten.
- Datenschutz: keine Fotos mit erkennbaren Kindergesichtern, unsere Kinder nur mit Vornamen. Nicht „nicht öffentlich“ behaupten – richtig ist: nicht bei Google, nur mit Link, keine Nachnamen, keine Gesichter.
- Commits über Git Bash mit Nachrichtendatei (`git commit -F`), Trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Vorher `git pull --rebase`; Konflikte in erzeugten Dateien mit `checkout --theirs data.js kalender*.ics`. Git: `C:\Program Files\Git\cmd\git.exe`, gh: `C:\Program Files\GitHub CLI\gh.exe`.
- Lokale Vorschau: kleines HttpListener-Skript auf `localhost:8801` (Ordner als Wurzel), im Browser-Fenster mit Handygröße testen.
- Kostenlos bleiben (keine bezahlten Dienste).

## Videos (nicht veröffentlicht, Ordner `screenshots/`)
- `hcvg-mannschafts-app-promo.mp4`: Promo-Video (2:33, Stimme des Users per ElevenLabs, letzter Satz abgeschnitten, Outro mit Hinweis „Annie teilt App & Video in der Gruppe der Kids“, erstes Bild = Wappen, WhatsApp-Szene an „Opa“). Bausteine gesichert in `screenshots/video-werkzeug/` (`promo-bilder.ps1`, `render-promo.ps1`, `shots.json`, `transcribe.ps1`, Vorschau-Server `serve2.ps1`). Die Bild-Pfade in `shots.json` zeigen auf alte Browser-Screenshots im Claude-Ordner `tool-results`; für ein neues Video neue Screenshots machen. ffmpeg ist per winget installiert.
- Geschäftsidee/Marktanalyse: eigener Ordner `Claude Projekte\mannschafts-app-geschaeftsidee`.

## Bilder
- `img/logo.webp` (Vereinswappen, Kopf + Favicon), `img/team-kreis.jpg` (Mannschaftskreis von oben, kaum Gesichter; Banner auf der Startseite, auf 900px verkleinert).
- Repo und Seite sind öffentlich: Fotos mit erkennbaren Kindergesichtern nur mit Einverständnis der Eltern einbauen. Seite hat `noindex`.
- Der Workflow kopiert `img/` mit nach `_site`.

## Design
- Farben als CSS-Tokens in `:root`, Hell- und Dunkelmodus.
- **Jugend-Farben:** C = dunkles Blau (`--court-c`), D = helleres Blau (`--court-d`). Klassen `tC`/`tD` setzen `--court`/`--accent`/`--badge` um: auf den Spielkarten, den Reitern (unten farbiger Strich, ausgewählt ganz gefärbt) und am `#view` der Jugend-Seiten bzw. der Analyse (je nach gewählter Jugend).
- Schriften: Barlow Condensed (Überschriften), Figtree (Text).
- Mobil zuerst: muss bei ~375px Breite sauber aussehen.

## Ideen für später
- Torjubel-Animation mit Comic-Avataren statt echter Kinderfotos (DSGVO)
