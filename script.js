const express = require("express");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
const PORT = 5000;

// static UI
app.use(express.static(path.join(__dirname, "public")));

// OPTIONAL: DNS backend (Rust runs separately on 8081)
const RUST_URL = "http://localhost:8081";

// DNS lookup
app.get("/api/lookup", async (req, res) => {
  try {
    const host = req.query.host;
    if (!host) return res.json({ error: "no host" });

    const r = await fetch(`${RUST_URL}/lookup?host=${host}`);
    const data = await r.json();

    res.json(data);
  } catch (e) {
    res.json({ error: e.message });
  }
});

// ready check
app.get("/api/ready", async (req, res) => {
  try {
    const r = await fetch(`${RUST_URL}/ready`);
    const text = await r.text();

    res.json({ status: text === "ok" ? "ready" : "not-ready" });
  } catch {
    res.json({ status: "rust-offline" });
  }
});

// root UI
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(PORT, () => {
  console.log(`Interstellar running on http://localhost:${PORT}`);
});