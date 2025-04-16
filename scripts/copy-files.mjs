import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '..', 'dishes');
const targetDir = path.join(__dirname, '..', 'build', 'dishes');

try {
  // Ensure the target directory exists
  fs.ensureDirSync(targetDir);
  // Copy the source directory to the target directory
  fs.copySync(sourceDir, targetDir, { overwrite: true });
  console.log('Successfully copied dishes directory to build directory.');

  // Make the main script executable (optional, but good practice if it's a CLI tool)
  const mainScriptPath = path.join(__dirname, '..', 'build', 'index.js');
  if (fs.existsSync(mainScriptPath)) {
    fs.chmodSync(mainScriptPath, '755');
    console.log(`Made ${mainScriptPath} executable.`);
  }

} catch (err) {
  console.error('Error copying files:', err);
  process.exit(1);
}