import { access, copyFile, mkdir, rm } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "netlify-public");

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

await rm(out, { recursive: true, force: true });
await mkdir(path.join(out, "akses"), { recursive: true });

await copyFile(
  path.join(root, "akses", "auth.js"),
  path.join(out, "akses", "auth.js")
);

const verificationFile = "buatqris-verify-7c7a191a8da43b57bf28704876b92857.txt";
const verificationSource = path.join(root, verificationFile);

if (await exists(verificationSource)) {
  await copyFile(
    verificationSource,
    path.join(out, verificationFile)
  );
}

console.log("Netlify public assets prepared.");
