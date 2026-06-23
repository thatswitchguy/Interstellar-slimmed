const express = require("express");

const app = express();

app.use(express.static("src"));

app.get("/api/dns", async (req, res) => {
  const host = req.query.host;

  try {
    const response = await fetch(
      `http://localhost:8081/lookup?host=${encodeURIComponent(host)}`
    );

    const data = await response.json();

    res.json(data);

  } catch (err) {

    res.status(500).json({
      error: String(err)
    });

  }
});

app.get("/proxy", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).send("Missing url parameter");
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/124.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
      },
      redirect: "follow"
    });

    const blockedHeaders = new Set([
      "x-frame-options",
      "content-security-policy",
      "content-security-policy-report-only",
      "x-content-type-options"
    ]);

    upstream.headers.forEach((value, key) => {
      if (!blockedHeaders.has(key.toLowerCase())) {
        try { res.setHeader(key, value); } catch (_) {}
      }
    });

    const contentType = upstream.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      let html = await upstream.text();

      const finalUrl = upstream.url || url;
      const origin = new URL(finalUrl).origin;

      if (!html.includes("<base")) {
        html = html.replace(
          /(<head[^>]*>)/i,
          `$1<base href="${origin}/">`
        );
        if (!html.includes("<base")) {
          html = `<base href="${origin}/">` + html;
        }
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }

    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (err) {
    const errPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Can't connect</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 100vw; height: 100vh;
      background: #0f1117; color: white;
      font-family: -apple-system, Inter, Arial, sans-serif;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 18px;
    }
    h2 { font-size: 22px; font-weight: 700; color: #e2e8f0; }
    p  { font-size: 14px; color: #64748b; max-width: 420px; text-align: center; }
    a  {
      display: inline-block;
      margin-top: 6px;
      padding: 11px 22px;
      background: #3b82f6;
      color: white;
      border-radius: 10px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
    }
    a:hover { background: #2563eb; }
    code { font-size: 12px; color: #475569; word-break: break-all; }
  </style>
</head>
<body>
  <h2>This site refused to connect</h2>
  <p>The proxy couldn't reach <strong>${url}</strong>.<br>
     It may be down, blocking automated requests, or require a direct connection.</p>
  <a href="${url}" target="_blank" rel="noopener">Open in new tab ↗</a>
  <code>${err.message}</code>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(errPage);
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Running on port " + PORT);
});
