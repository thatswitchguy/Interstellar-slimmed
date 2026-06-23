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
    res.status(500).send("Proxy error: " + err.message);
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Running on port " + PORT);
});
