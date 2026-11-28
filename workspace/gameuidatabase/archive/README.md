# UIForge behavior archive — https://www.gameuidatabase.com/

A complete, offline replica that RUNS THE REAL CODE against recorded responses. Client-side interactions (tabs, filters, lists, accordions, motion, scroll) work because it is the site's own JavaScript, replaying its own data.

```bash
node serve.mjs        # zero-dependency replay server
```

Then open the printed http://localhost URL. 117 responses archived.

## Browse & edit it

Everything is under `files/` as a **readable mirror of the site** — real folders, real filenames, real extensions (`.html`, `.js`, `.css`, `.json`, fonts, images), not opaque blobs. Open any of it. **Edit a text response** (e.g. `files/www.gameuidatabase.com/index.html`) and re-run `node serve.mjs` — the change shows up, because the server reads files fresh on every request. `index.json` maps each request → its file.

Editing minified vendor JS by hand is painful, though. If you want a **clean, componentized copy you can actually develop** — editable React with the site's real classes + real CSS, your own content — generate a **Restore** instead (`uiforge-restore` / `/uiforge:clone --restore`). The Archive is for *behavior* (it runs the real JS); the Restore is for *editing* (a pixel-identical but **static** React snapshot — it consumes THIS archive, it does not re-scrape the site).

Server-dependent actions only replay if their response was recorded during capture — run with `--explore` and interact more to widen coverage.
