// form.js
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";

const app = express();
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Site Setup</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 480px; margin: 3rem auto; padding: 0 1rem; }
  label { display: block; margin-top: 1rem; font-weight: 600; }
  input { width: 100%; padding: .5rem; margin-top: .25rem; box-sizing: border-box; }
  button { margin-top: 1.5rem; padding: .6rem 1.2rem; font-size: 1rem; cursor: pointer; }
  .err { color: #b00020; margin-top: .5rem; }
</style></head>
<body>
  <h1>Configure your site</h1>
  <form method="POST" action="/save">
    <label>Site title
      <input name="title" required maxlength="120" placeholder="My Site">
    </label>
    <label>Tagline
      <input name="tagline" maxlength="200" placeholder="Optional">
    </label>
    <label>Description
      <input name="description" maxlength="300" placeholder="Optional">
    </label>
    <button type="submit">Save &amp; continue</button>
  </form>
</body></html>`);
});

app.post("/save", async (req, res) => {
  const { title, tagline, description } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).send("Title is required. <a href='/'>Go back</a>");
  }

  const config = {
    title: title.trim(),
    ...(tagline && { tagline: tagline.trim() }),
    ...(description && { description: description.trim() }),
  };

  await fs.writeFile("site-config.json", JSON.stringify(config, null, 2), "utf8");

  res.send(`<!doctype html><html><body style="font-family:system-ui;max-width:480px;margin:3rem auto">
    <h1>✅ Saved</h1>
    <p>You can close this tab. The automation will continue in your terminal.</p>
  </body></html>`);
});

const server = app.listen(0, () => {
  const { port } = server.address();
  console.log(`\nForm is ready at: http://localhost:${port}\nOpen it in your browser.`);
  console.log("(Waiting for you to submit the form...)");
});

// Resolve when the file has been written, then shut down the server.
const watcher = setInterval(async () => {
  try {
    await fs.access("site-config.json");
    clearInterval(watcher);
    server.close();
    console.log("✅ site-config.json written. Continuing...");
  } catch { /* not written yet */ }
}, 500);