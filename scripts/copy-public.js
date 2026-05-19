const fs = require("fs");
const path = require("path");

// Copy public HTML files to dist
const publicDir = path.join(__dirname, "../public");
const distDir = path.join(__dirname, "../dist");

// Files to copy
const filesToCopy = [
  "privacy-policy.html",
  "terms-and-conditions.html",
  "delete-account.html",
];

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy each file
filesToCopy.forEach((file) => {
  const src = path.join(publicDir, file);
  const dest = path.join(distDir, file);

  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file} to dist/`);
  } else {
    console.log(`✗ ${file} not found in public/`);
  }
});

console.log("Public files copied successfully");
