import { gzipSync } from "node:zlib";
import { promises as fs } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const distAssetsDir = path.join(cwd, "dist", "assets");
const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(cwd, "plans", "perf-baseline.json");

function toRelative(filePath) {
  return path.relative(cwd, filePath).replace(/\\/g, "/");
}

async function listAssetFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(dir, entry.name));
}

function pickMainChunk(jsFiles) {
  const namedIndex = jsFiles.find((file) =>
    path.basename(file).startsWith("index-")
  );
  if (namedIndex) return namedIndex;
  return jsFiles[0] ?? null;
}

async function readFileStat(filePath) {
  const buffer = await fs.readFile(filePath);
  return {
    file: toRelative(filePath),
    sizeBytes: buffer.length,
    gzipBytes: gzipSync(buffer).length,
  };
}

async function countFilesByExtension(rootDir, extension) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      count += await countFilesByExtension(fullPath, extension);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(extension)) {
      count += 1;
    }
  }
  return count;
}

async function main() {
  const assets = await listAssetFiles(distAssetsDir);
  const jsFiles = assets.filter((file) => file.endsWith(".js"));
  const cssFiles = assets.filter((file) => file.endsWith(".css"));

  const jsStats = await Promise.all(jsFiles.map(readFileStat));
  const cssStats = await Promise.all(cssFiles.map(readFileStat));
  const mainChunkFile = pickMainChunk(jsFiles);
  const mainChunk = mainChunkFile ? await readFileStat(mainChunkFile) : null;
  const tsxCount = await countFilesByExtension(path.join(cwd, "src"), ".tsx");

  const report = {
    capturedAt: new Date().toISOString(),
    buildStatus: "pass",
    metrics: {
      tsxFiles: tsxCount,
      mainChunk,
      totals: {
        jsBytes: jsStats.reduce((sum, stat) => sum + stat.sizeBytes, 0),
        jsGzipBytes: jsStats.reduce((sum, stat) => sum + stat.gzipBytes, 0),
        cssBytes: cssStats.reduce((sum, stat) => sum + stat.sizeBytes, 0),
        cssGzipBytes: cssStats.reduce((sum, stat) => sum + stat.gzipBytes, 0),
      },
      topJsAssets: jsStats
        .sort((a, b) => b.sizeBytes - a.sizeBytes)
        .slice(0, 10),
    },
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Wrote bundle report to ${toRelative(outputPath)}`);
  if (mainChunk) {
    console.log(
      `Main chunk: ${mainChunk.file} (${mainChunk.sizeBytes} bytes, gzip ${mainChunk.gzipBytes} bytes)`
    );
  }
}

main().catch((error) => {
  console.error("Failed to generate bundle report:", error);
  process.exitCode = 1;
});
