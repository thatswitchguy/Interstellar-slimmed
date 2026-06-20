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

app.listen(3000, () => {
  console.log("Running on port 3000");
});