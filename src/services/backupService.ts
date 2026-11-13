import type { PrintOpsBackup } from '../types/calculator';
import { DatabaseService } from './database';

const BACKUP_DIR_NAME = 'PrintOps3D_Backups';
const MAX_BACKUP_RETENTION = 10;
const LAST_AUTO_BACKUP_DATE_KEY = 'printops_last_auto_backup_date';

/**
 * Formats a clean date string: YYYY-MM-DD
 */
export function formatBackupDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a timestamp string: YYYY-MM-DD_HHmmss
 */
export function formatBackupTimestampString(date: Date = new Date()): string {
  const datePart = formatBackupDateString(date);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${datePart}_${hh}${mm}${ss}`;
}

/**
 * Triggers a 1-click browser download of the complete JSON master backup.
 */
export async function downloadMasterBackupFile(): Promise<string> {
  const db = DatabaseService.getInstance();
  const backupData = await db.exportFullBackup();
  const filename = `PrintOps3D_Backup_${formatBackupDateString()}.json`;

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Validates and restores a master backup file from a dropped / selected .json File.
 */
export async function restoreMasterBackupFromFile(
  file: File
): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as PrintOpsBackup;

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Invalid JSON file content.' };
    }

    if (!parsed.settings || !Array.isArray(parsed.spools)) {
      return {
        success: false,
        message: 'File is missing required PrintOps backup structure (settings/spools).',
      };
    }

    const db = DatabaseService.getInstance();
    await db.restoreFullBackup(parsed);

    return {
      success: true,
      message: `Successfully restored backup from ${parsed.export_date || file.name}!`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Failed to restore backup: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Silent rotating local backup:
 * - Runs once per day on app launch and immediately after confirming a sale/print.
 * - In Tauri native desktop app, uses @tauri-apps/plugin-fs to write to Documents/PrintOps3D_Backups/
 * - Automatically rotates and prunes files older than the 10 most recent.
 * - In web browser preview, silently maintains rotating entries in localStorage.
 */
export async function performSilentRotatingBackup(force = false): Promise<void> {
  if (typeof window === 'undefined') return;

  const today = formatBackupDateString();
  if (!force) {
    const lastBackup = localStorage.getItem(LAST_AUTO_BACKUP_DATE_KEY);
    if (lastBackup === today) {
      // Already backed up today
      return;
    }
  }

  try {
    const db = DatabaseService.getInstance();
    const backupData = await db.exportFullBackup();
    const timestamp = formatBackupTimestampString();
    const fileName = `PrintOps3D_Backup_${timestamp}.json`;
    const jsonStr = JSON.stringify(backupData, null, 2);

    let isTauri = false;
    if ('__TAURI_INTERNALS__' in window || '__TAURI__' in window) {
      try {
        const fsMod = await import('@tauri-apps/plugin-fs');
        const pathMod = await import('@tauri-apps/api/path');

        if (fsMod && pathMod) {
          isTauri = true;
          const docDir = await pathMod.documentDir();
          const targetDir = `${docDir}/${BACKUP_DIR_NAME}`;

          // Ensure directory exists
          try {
            await fsMod.mkdir(targetDir, { recursive: true });
          } catch {
            // directory might already exist
          }

          // Write new backup file
          const filePath = `${targetDir}/${fileName}`;
          await fsMod.writeTextFile(filePath, jsonStr);

          // Rotate: list files, sort descending, delete beyond MAX_BACKUP_RETENTION
          try {
            const dirEntries = await fsMod.readDir(targetDir);
            const backupFiles = dirEntries
              .filter(
                (entry) =>
                  entry.name &&
                  entry.name.startsWith('PrintOps3D_Backup_') &&
                  entry.name.endsWith('.json')
              )
              .sort((a, b) => (b.name || '').localeCompare(a.name || ''));

            if (backupFiles.length > MAX_BACKUP_RETENTION) {
              const filesToDelete = backupFiles.slice(MAX_BACKUP_RETENTION);
              for (const oldFile of filesToDelete) {
                if (oldFile.name) {
                  try {
                    await fsMod.remove(`${targetDir}/${oldFile.name}`);
                  } catch {
                    // ignore
                  }
                }
              }
            }
          } catch (rotErr) {
            console.warn('Backup rotation pruning warning:', rotErr);
          }
        }
      } catch (tauriErr) {
        console.warn('Tauri fs auto-backup error, falling back:', tauriErr);
      }
    }

    if (!isTauri) {
      // Browser fallback rotation
      const fallbackKey = 'printops_auto_backups_rotation';
      try {
        const raw = localStorage.getItem(fallbackKey);
        const list: Array<{ name: string; date: string }> = raw
          ? JSON.parse(raw)
          : [];
        const updated = [{ name: fileName, date: new Date().toISOString() }, ...list].slice(
          0,
          MAX_BACKUP_RETENTION
        );
        localStorage.setItem(fallbackKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }

    localStorage.setItem(LAST_AUTO_BACKUP_DATE_KEY, today);
  } catch (err) {
    console.warn('Auto backup notice:', err);
  }
}
