// server.js - CORS Anywhere versi Node.js untuk Render.com
// Bisa dipakai langsung dengan:
//   /https://example.com
//   /proxy/https://example.com

import express from "express";
import fetch from "node-fetch";

const app = express();

// Render memberikan PORT melalui environment variable
const PORT = process.env.PORT || 3000;

app.use(express.raw({ type: "*/*", limit: "25mb" }));

// CORS header
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
}

// Preflight OPTIONS
app.options("*", (req, res) => {
  cors(res);
  return res.sendStatus(204);
});

app.use(async (req, res) => {
  cors(res);

  let path = req.path;

  // memungkinkan:
  // /proxy/https://example.com
  // /https://example.com
  if (path.startsWith("/proxy/")) path = path.replace("/proxy/", "");
  if (path.startsWith("/")) path = path.slice(1);

  if (!path) {
    return res.status(400).send(
      `Gunakan format:
      
      /https://example.com
      /proxy/https://example.com/api`
    );
  }

  if (!path.startsWith("http://") && !path.startsWith("https://")) {
    return res.status(400).send("URL harus dimulai dengan http:// atau https://");
  }

  try {
    const upstream = await fetch(path, {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).filter(([key]) => {
          key = key.toLowerCase();
          return ![
            "host",
            "connection",
            "keep-alive",
            "proxy-authenticate",
            "proxy-authorization",
            "te",
            "trailer",
            "transfer-encoding",
            "upgrade"
          ].includes(key);
        })
      ),
      body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
      redirect: "follow",
    });

    // forward headers dari target
    upstream.headers.forEach((value, key) => res.setHeader(key, value));

    // tambahkan CORS lagi (overwrite jika perlu)
    cors(res);

    res.status(upstream.status);

    const buff = Buffer.from(await upstream.arrayBuffer());
    res.send(buff);
  } catch (err) {
    res.status(500).send("Kesalahan proxy: " + err.message);
  }
});

// Listen pada PORT dari Render.com
app.listen(PORT, "0.0.0.0", () => {
  console.log(`CORS Anywhere Node.js berjalan di port ${PORT}`);
});
