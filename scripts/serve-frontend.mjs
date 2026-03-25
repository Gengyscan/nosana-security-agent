import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.FRONTEND_PORT ?? 4173);
const root = process.env.FRONTEND_DIST_DIR ?? "/app/frontend-dist";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const getPath = (urlPath) => {
  const clean = normalize(urlPath).replace(/^([.][.][/\\])+/, "");
  return join(root, clean === "/" ? "index.html" : clean);
};

const server = createServer(async (request, response) => {
  const requestPath = request.url ?? "/";
  const filePath = getPath(requestPath);

  let targetPath = filePath;
  try {
    const metadata = await stat(filePath);
    if (metadata.isDirectory()) {
      targetPath = join(filePath, "index.html");
    }
  } catch {
    targetPath = join(root, "index.html");
  }

  if (!existsSync(targetPath)) {
    response.statusCode = 404;
    response.end("Not found");
    return;
  }

  const ext = extname(targetPath).toLowerCase();
  const contentType = mimeTypes[ext] ?? "application/octet-stream";
  response.setHeader("Content-Type", contentType);
  createReadStream(targetPath).pipe(response);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Sentinel UI serving ${root} on port ${port}`);
});
