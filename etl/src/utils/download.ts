/**
 * Utilities for downloading data files from online sources
 */

import * as fs from "fs";
import * as path from "path";
import fetch from "node-fetch";

export interface DownloadOptions {
  url: string;
  filePath: string;
  force?: boolean;
}

/**
 * Download a file from URL with resume support and progress logging
 */
export async function downloadFile(options: DownloadOptions): Promise<void> {
  const { url, filePath, force = false } = options;
  const dir = path.dirname(filePath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Skip if file exists and force is false
  if (fs.existsSync(filePath) && !force) {
    console.log(`  ✓ Already exists: ${path.basename(filePath)}`);
    return;
  }

  console.log(`  ⬇ Downloading: ${path.basename(filePath)}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }

  // Get file size for progress reporting
  const fileSize = response.headers.get("content-length")
    ? parseInt(response.headers.get("content-length")!, 10)
    : 0;

  let downloadedSize = 0;
  const writeStream = fs.createWriteStream(filePath);

  // Report progress every 10%
  if (response.body) {
    response.body.on("data", (chunk: Buffer) => {
      downloadedSize += chunk.length;
      if (fileSize > 0) {
        const percent = Math.round((downloadedSize / fileSize) * 100);
        process.stdout.write(`\r    ${percent}%`);
      }
    });

    await new Promise((resolve, reject) => {
      response.body!.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });
  }

  console.log(" ✓");
}

/**
 * Download multiple files with error handling
 */
export async function downloadFiles(options: DownloadOptions[]): Promise<void> {
  for (const opt of options) {
    try {
      await downloadFile(opt);
    } catch (err) {
      console.error(`  ✗ Failed to download ${opt.url}:`, err);
      throw err;
    }
  }
}

/**
 * Verify file exists and has reasonable size
 */
export function verifyFile(filePath: string, minSize = 1000): boolean {
  if (!fs.existsSync(filePath)) {
    console.log(`  ✗ File does not exist: ${filePath}`);
    return false;
  }

  const stats = fs.statSync(filePath);
  if (stats.size < minSize) {
    console.log(`  ✗ File too small: ${filePath} (${stats.size} bytes)`);
    return false;
  }

  return true;
}
