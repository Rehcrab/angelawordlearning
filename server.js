// ============================================================================
//  server.js  -  Tiny static server + DeepSeek proxy (NO dependencies needed)
// ----------------------------------------------------------------------------
//  Why: browsers often block direct calls to api.deepseek.com (CORS).
//       This serves the app AND forwards /api/chat to DeepSeek, so the app
//       can fall back to it automatically.
//
//  How to run:
//       node server.js
//    then open:  http://localhost:3000
//
//  Your API key still lives in config.js on the page; the proxy just relays it.
// ============================================================================

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DEEPSEEK_HOST = "api.deepseek.com";
const DEEPSEEK_PATH = "/chat/completions";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found: " + urlPath);
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(data);
  });
}

function saveApiKey(req, res) {
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    let apiKey = "";
    try {
      const parsed = JSON.parse(body || "{}");
      apiKey = String(parsed.apiKey || "").trim();
    } catch (_) {
      res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ error: "Invalid request body." }));
      return;
    }

    if (!apiKey) {
      res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ error: "Paste a DeepSeek API key first." }));
      return;
    }
    if (apiKey.length > 256 || /[\r\n]/.test(apiKey)) {
      res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ error: "That does not look like a valid API key." }));
      return;
    }

    const configPath = path.join(ROOT, "config.js");
    fs.readFile(configPath, "utf8", (err, src) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ error: "Could not read config.js." }));
        return;
      }
      if (!/API_KEY:\s*"/.test(src)) {
        res.writeHead(500, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ error: "config.js does not contain API_KEY." }));
        return;
      }
      const next = src.replace(/API_KEY:\s*"[^"]*"/, "API_KEY: " + JSON.stringify(apiKey));
      fs.writeFile(configPath, next, "utf8", (writeErr) => {
        if (writeErr) {
          res.writeHead(500, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          res.end(JSON.stringify({ error: "Could not write config.js." }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
      });
    });
  });
}

function proxyChat(req, res) {
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    };
    if (req.headers["authorization"]) headers["Authorization"] = req.headers["authorization"];

    const proxyReq = https.request(
      { host: DEEPSEEK_HOST, path: DEEPSEEK_PATH, method: "POST", headers },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, {
          "Content-Type": proxyRes.headers["content-type"] || "application/json",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        });
        proxyRes.pipe(res);
      }
    );

    proxyReq.on("error", (err) => {
      res.writeHead(502, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ error: { message: "Proxy error: " + err.message } }));
    });

    proxyReq.write(body);
    proxyReq.end();
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  const urlPath = req.url.split("?")[0];

  if (req.method === "POST" && urlPath === "/api/chat") {
    proxyChat(req, res);
    return;
  }

  if (req.method === "POST" && urlPath === "/api/key") {
    saveApiKey(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log("Vocabulary Worksheet Generator running at http://localhost:" + PORT);
  console.log("Proxying /api/chat  ->  https://" + DEEPSEEK_HOST + DEEPSEEK_PATH);
});
