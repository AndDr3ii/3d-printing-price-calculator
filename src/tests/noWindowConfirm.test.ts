import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Zero window.confirm() Verification', () => {
  function getSourceFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getSourceFiles(fullPath));
      } else if (/\.(tsx?)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('verifies that zero window.confirm() or native confirm() dialogs exist in src/', () => {
    const srcDir = path.resolve(__dirname, '..');
    const files = getSourceFiles(srcDir);

    // Filter out test files and ConfirmDeleteModal implementation
    const sourceFiles = files.filter(
      (f) => !f.includes(`${path.sep}tests${path.sep}`)
    );

    const matches: Array<{ file: string; line: number; text: string }> = [];

    // Regex matching window.confirm(...) or standalone confirm(...)
    const confirmRegex = /\b(?:window\.)?confirm\s*\(/g;

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Exclude onConfirm prop definitions / calls
        if (line.includes('onConfirm') || line.includes('confirmLabel')) {
          return;
        }

        if (confirmRegex.test(line)) {
          matches.push({
            file: path.relative(srcDir, filePath),
            line: index + 1,
            text: line.trim(),
          });
        }
      });
    }

    expect(matches).toEqual([]);
  });
});
