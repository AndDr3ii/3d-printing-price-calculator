import JSZip from 'jszip';
import type {
  FilamentSlotAssignment,
  FilamentSlotUsage,
} from '../types/calculator';

export interface SlicedFileParseResult {
  printHours: number;
  printMinutes: number;
  modelWeight: number; // in grams
  projectName?: string;
  rawTimeSeconds?: number;
  slicerDetected?: string;
  success: boolean;
  message?: string;
  isUnsliced3mf?: boolean;
  filamentSlots?: FilamentSlotUsage[];
}

/**
 * Strips known 3D extensions (.gcode.3mf, .3mf, .gcode, .gco, .stl)
 * and formats the filename cleanly for the Project / Job Name.
 */
export function cleanProjectNameFromFileName(filename: string): string {
  const base = filename
    .replace(/\.gcode\.3mf$/i, '')
    .replace(/\.3mf$/i, '')
    .replace(/\.gcode$/i, '')
    .replace(/\.gco$/i, '')
    .replace(/\.stl$/i, '')
    .trim();

  // Replace underscores and multiple dashes with clean spaces
  const cleaned = base
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || filename;
}

/**
 * Extracts per-filament slot usage (1 to 4 AMS Lite slots) from Bambu Studio / OrcaSlicer XML.
 */
export function extractFilamentSlotsFromXml(xmlText: string): FilamentSlotUsage[] {
  const slots: FilamentSlotUsage[] = [];

  // Match <filament ... /> or <filament>...</filament> tags
  const filamentTagRegex = /<filament\b([^>]*)(?:\/>|>([\s\S]*?)<\/filament>)/gi;
  let match: RegExpExecArray | null;

  while ((match = filamentTagRegex.exec(xmlText)) !== null) {
    const attrs = match[1] || '';
    const inner = match[2] || '';

    const idMatch =
      attrs.match(/\bid\s*=\s*["'](\d+)["']/i) ||
      inner.match(/<id>(\d+)<\/id>/i);
    const typeMatch =
      attrs.match(/\btype\s*=\s*["']([^"']+)["']/i) ||
      inner.match(/<type>([^<]+)<\/type>/i);
    const colorMatch =
      attrs.match(/\bcolor\s*=\s*["']([^"']+)["']/i) ||
      inner.match(/<color>([^<]+)<\/color>/i);
    const weightMatch =
      attrs.match(/\bused_g\s*=\s*["']([0-9.]+)["']/i) ||
      attrs.match(/\bweight\s*=\s*["']([0-9.]+)["']/i) ||
      attrs.match(/\bfilament_used_g\s*=\s*["']([0-9.]+)["']/i) ||
      inner.match(/<used_g>([0-9.]+)<\/used_g>/i) ||
      inner.match(/<weight>([0-9.]+)<\/weight>/i);

    const slotId = idMatch ? parseInt(idMatch[1], 10) : slots.length + 1;
    const type = typeMatch ? typeMatch[1].trim() : 'PETG';
    let color = colorMatch ? colorMatch[1].trim() : '#71717A';
    if (!color.startsWith('#')) {
      color = `#${color}`;
    }
    const usedGrams = weightMatch ? parseFloat(weightMatch[1]) : 0;

    if (usedGrams > 0 || slots.length < 4) {
      slots.push({
        id: slotId,
        type,
        color,
        usedGrams: Math.round(usedGrams * 10) / 10,
      });
    }
  }

  // Deduplicate by slot id (keeping largest grams if multiple plates)
  const slotMap = new Map<number, FilamentSlotUsage>();
  for (const s of slots) {
    const existing = slotMap.get(s.id);
    if (!existing) {
      slotMap.set(s.id, s);
    } else {
      slotMap.set(s.id, {
        ...existing,
        usedGrams: Math.round((existing.usedGrams + s.usedGrams) * 10) / 10,
      });
    }
  }

  return Array.from(slotMap.values())
    .filter((s) => s.usedGrams > 0)
    .sort((a, b) => a.id - b.id);
}

/**
 * Extracts multi-filament slots from GCode comments (fallback for .gcode and legacy slicers).
 */
export function extractFilamentSlotsFromGCode(content: string): FilamentSlotUsage[] {
  const lines = content.split(/\r?\n/).slice(0, 500);
  let weights: number[] = [];
  let colors: string[] = [];
  let types: string[] = [];

  for (const line of lines) {
    if (weights.length === 0) {
      const wMatch = line.match(
        /;\s*(?:filament used \[g\]|filament_used_g)\s*=\s*([0-9.,\s]+)/i
      );
      if (wMatch && wMatch[1].includes(',')) {
        weights = wMatch[1]
          .split(',')
          .map((p) => parseFloat(p.trim()))
          .filter((v) => Number.isFinite(v));
      }
    }

    if (colors.length === 0) {
      const cMatch = line.match(
        /;\s*(?:filament_colour|filament_color)\s*=\s*([^;]+(?:;[^;]+)*)/i
      );
      if (cMatch) {
        colors = cMatch[1]
          .split(';')
          .map((c) => c.trim())
          .filter(Boolean);
      }
    }

    if (types.length === 0) {
      const tMatch = line.match(
        /;\s*filament_type\s*=\s*([^;]+(?:;[^;]+)*)/i
      );
      if (tMatch) {
        types = tMatch[1]
          .split(';')
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }
  }

  if (weights.length > 1) {
    return weights
      .map((w, idx) => {
        let color = colors[idx] || '#71717A';
        if (!color.startsWith('#')) color = `#${color}`;
        return {
          id: idx + 1,
          type: types[idx] || 'PETG',
          color,
          usedGrams: Math.round(w * 10) / 10,
        };
      })
      .filter((s) => s.usedGrams > 0);
  }

  return [];
}

/**
 * Calculates weighted material cost across all assigned multi-color slots.
 */
export function calculateWeightedMaterialCost(
  slots: FilamentSlotAssignment[],
  defaultPrice: number,
  defaultWeight: number
): number {
  if (!slots || slots.length === 0) return 0;

  return slots.reduce((total, slot) => {
    const price = slot.customSpoolPrice ?? defaultPrice;
    const weight = slot.customSpoolWeight ?? defaultWeight;
    const pricePerGram = weight > 0 ? price / weight : 0;
    return total + slot.usedGrams * pricePerGram;
  }, 0);
}

/**
 * Parses raw G-code text (from a standalone .gcode file or extracted from a .3mf)
 */
export function parseGCodeContent(
  content: string,
  projectName?: string
): SlicedFileParseResult {
  const lines = content.split(/\r?\n/);
  // Scan first 300 lines and last 600 lines
  const headLines = lines.slice(0, 300);
  const tailLines = lines.slice(-600);
  const targetLines = [...headLines, ...tailLines];

  let detectedSeconds: number | null = null;
  let detectedGrams: number | null = null;
  let detectedSlicer: string | undefined = undefined;

  // Patterns for Print Time:
  // 1) Bambu / Orca: ; total estimated time: 1h 25m 12s  or ; total estimated time: 35m 20s
  // 2) PrusaSlicer: ; estimated printing time (normal mode) = 3h 25m 12s
  // 3) Cura: ;TIME:1161 (in seconds)
  const bambuTimeRegex =
    /;\s*(?:total estimated time|estimated printing time(?:\s*\([^)]*\))?|print_time)\s*[:=]\s*(.*)/i;
  const curaTimeRegex = /;\s*TIME\s*:\s*(\d+)/i;

  // Patterns for Filament Weight:
  // 1) Bambu / Orca: ; total filament weight [g] : 14.52 or ; total filament weight [g] = 14.52
  // 2) Prusa: ; total filament used [g] = 14.52
  // 3) Cura: ;Filament used: 0.836139m
  const weightRegex =
    /;\s*(?:total filament weight \[g\]|total filament used \[g\]|filament used \[g\]|filament_used_g)\s*[:=]\s*([0-9.,\s]+)/i;
  const curaMeterRegex = /;\s*Filament used\s*:\s*([0-9.]+)\s*m/i;

  for (const line of targetLines) {
    // Slicer detection
    if (/generated by BambuStudio|BambuStudio/i.test(line))
      detectedSlicer = 'Bambu Studio';
    else if (/generated by OrcaSlicer|OrcaSlicer/i.test(line))
      detectedSlicer = 'OrcaSlicer';
    else if (/generated by PrusaSlicer/i.test(line))
      detectedSlicer = 'PrusaSlicer';
    else if (/generated by Cura/i.test(line) || /;FLAVOR:/i.test(line))
      detectedSlicer = detectedSlicer || 'Cura';

    // Time parsing - Formatted string (Bambu / Orca / Prusa)
    if (detectedSeconds === null) {
      const tMatch = line.match(bambuTimeRegex);
      if (tMatch && tMatch[1]) {
        const timeStr = tMatch[1].trim();
        const days = (timeStr.match(/(\d+)\s*d/i) || [])[1];
        const hours = (timeStr.match(/(\d+)\s*h/i) || [])[1];
        const mins = (timeStr.match(/(\d+)\s*m(?:in)?/i) || [])[1];
        const secs = (timeStr.match(/(\d+)\s*s(?:ec)?/i) || [])[1];

        if (days || hours || mins || secs) {
          const totalSecs =
            (days ? parseInt(days, 10) * 86400 : 0) +
            (hours ? parseInt(hours, 10) * 3600 : 0) +
            (mins ? parseInt(mins, 10) * 60 : 0) +
            (secs ? parseInt(secs, 10) : 0);
          if (totalSecs > 0) detectedSeconds = totalSecs;
        }
      }
    }

    // Time parsing - Cura seconds format
    if (detectedSeconds === null) {
      const cMatch = line.match(curaTimeRegex);
      if (cMatch && cMatch[1]) {
        detectedSeconds = parseInt(cMatch[1], 10);
      }
    }

    // Weight parsing
    if (detectedGrams === null) {
      const wMatch = line.match(weightRegex);
      if (wMatch && wMatch[1]) {
        const parts = wMatch[1].split(',').map((p) => parseFloat(p.trim()));
        const sum = parts.reduce(
          (acc, val) => acc + (Number.isFinite(val) ? val : 0),
          0
        );
        if (sum > 0) {
          detectedGrams = sum;
        }
      }
    }

    // Weight fallback - Cura meters to grams
    if (detectedGrams === null) {
      const mMatch = line.match(curaMeterRegex);
      if (mMatch && mMatch[1]) {
        const meters = parseFloat(mMatch[1]);
        if (Number.isFinite(meters) && meters > 0) {
          detectedGrams = Math.round(meters * 2.98 * 10) / 10;
        }
      }
    }
  }

  const success = detectedSeconds !== null || detectedGrams !== null;
  const printHours = detectedSeconds ? Math.floor(detectedSeconds / 3600) : 0;
  const printMinutes = detectedSeconds
    ? Math.round((detectedSeconds % 3600) / 60)
    : 0;

  const filamentSlots = extractFilamentSlotsFromGCode(content);

  return {
    printHours,
    printMinutes,
    modelWeight: detectedGrams ? Math.round(detectedGrams * 10) / 10 : 0,
    projectName,
    rawTimeSeconds: detectedSeconds ?? undefined,
    slicerDetected: detectedSlicer,
    filamentSlots: filamentSlots.length > 0 ? filamentSlots : undefined,
    success,
    message: success
      ? `Autofilled from ${detectedSlicer || 'Sliced File'}: ${printHours}h ${printMinutes}m, ${detectedGrams ? `${detectedGrams.toFixed(1)}g` : 'weight estimated'}${filamentSlots.length > 1 ? ` (${filamentSlots.length} AMS slots)` : ''}`
      : 'Could not extract slice metadata from this file.',
  };
}

/**
 * Inspects a .3mf or .gcode.3mf ZIP archive using JSZip:
 * 1. Checks Metadata/slice_info.config (XML) for prediction (seconds) and weight (grams)
 * 2. Checks Metadata/plate_*.gcode or any internal .gcode for slice headers
 * 3. Detects if it's an unsliced CAD/geometry .3mf (prompting the user)
 */
export async function parse3mfArchive(
  file: File
): Promise<SlicedFileParseResult> {
  const cleanName = cleanProjectNameFromFileName(file.name);

  try {
    const zip = await JSZip.loadAsync(file);

    // 1. Look for Bambu Studio / OrcaSlicer slice_info.config
    const sliceInfoFile =
      zip.file('Metadata/slice_info.config') ||
      zip.file(/.*slice_info\.config$/i)[0];

    if (sliceInfoFile) {
      const xmlText = await sliceInfoFile.async('text');
      let seconds: number | null = null;
      let totalGrams: number | null = null;

      // Extract prediction="12345" or <prediction>12345</prediction>
      const predMatch =
        xmlText.match(/prediction\s*=\s*["'](\d+)["']/i) ||
        xmlText.match(/<prediction>(\d+)<\/prediction>/i);
      if (predMatch && predMatch[1]) {
        seconds = parseInt(predMatch[1], 10);
      }

      // Extract weight="14.52" or <weight>14.52</weight> across all plates/filaments
      const weightMatches = Array.from(
        xmlText.matchAll(/weight\s*=\s*["']([0-9.]+)["']/gi)
      );
      if (weightMatches.length > 0) {
        let sum = 0;
        for (const m of weightMatches) {
          const val = parseFloat(m[1]);
          if (Number.isFinite(val)) sum += val;
        }
        if (sum > 0) totalGrams = sum;
      }

      // Check for flush / purge weight if explicitly separated
      const flushMatches = Array.from(
        xmlText.matchAll(/flush_weight\s*=\s*["']([0-9.]+)["']/gi)
      );
      if (flushMatches.length > 0) {
        for (const m of flushMatches) {
          const val = parseFloat(m[1]);
          if (Number.isFinite(val)) totalGrams = (totalGrams || 0) + val;
        }
      }

      const filamentSlots = extractFilamentSlotsFromXml(xmlText);
      if ((totalGrams === null || totalGrams === 0) && filamentSlots.length > 0) {
        totalGrams = filamentSlots.reduce((acc, s) => acc + s.usedGrams, 0);
      }

      if (seconds !== null || totalGrams !== null) {
        const printHours = seconds ? Math.floor(seconds / 3600) : 0;
        const printMinutes = seconds ? Math.round((seconds % 3600) / 60) : 0;
        const finalWeight = totalGrams
          ? Math.round(totalGrams * 10) / 10
          : 0;

        const slotSummary =
          filamentSlots.length > 1
            ? ` (${filamentSlots.length} AMS slots)`
            : '';

        return {
          printHours,
          printMinutes,
          modelWeight: finalWeight,
          projectName: cleanName,
          rawTimeSeconds: seconds ?? undefined,
          slicerDetected: 'Bambu Studio / OrcaSlicer',
          filamentSlots: filamentSlots.length > 0 ? filamentSlots : undefined,
          success: true,
          message: `Autofilled from Bambu Studio / OrcaSlicer .3mf: ${printHours}h ${printMinutes}m, ${finalWeight}g${slotSummary}`,
        };
      }
    }

    // 2. Fallback: Search for any internal .gcode file inside Metadata/ or root
    const gcodeEntry = zip.file(/.*\.gcode$/i)[0];
    if (gcodeEntry) {
      const gcodeText = await gcodeEntry.async('text');
      const gcodeResult = parseGCodeContent(gcodeText, cleanName);
      if (gcodeResult.success) {
        return {
          ...gcodeResult,
          projectName: cleanName,
          message: `Autofilled from .3mf (${gcodeResult.slicerDetected || 'Bambu/Orca'}): ${gcodeResult.printHours}h ${gcodeResult.printMinutes}m, ${gcodeResult.modelWeight}g`,
        };
      }
    }

    // 3. If neither slice_info.config nor .gcode was found, it's an unsliced .3mf project
    return {
      printHours: 0,
      printMinutes: 0,
      modelWeight: 0,
      projectName: cleanName,
      success: false,
      isUnsliced3mf: true,
      message:
        'This .3mf file is an unsliced 3D model. Please slice it in Bambu Studio or OrcaSlicer first, then export the sliced file (.gcode.3mf or .gcode).',
    };
  } catch {
    return {
      printHours: 0,
      printMinutes: 0,
      modelWeight: 0,
      projectName: cleanName,
      success: false,
      message: 'Could not read or unzip this .3mf file.',
    };
  }
}

/**
 * Universal file handler dispatching between .gcode and .3mf / .gcode.3mf
 */
export async function parseUploadedSlicedFile(
  file: File
): Promise<SlicedFileParseResult> {
  const lowerName = file.name.toLowerCase();

  // Guard against .stl files directly
  if (lowerName.endsWith('.stl')) {
    return {
      printHours: 0,
      printMinutes: 0,
      modelWeight: 0,
      projectName: cleanProjectNameFromFileName(file.name),
      success: false,
      message:
        'STL files contain raw 3D geometry and do not have print time or filament weight. Please slice your model in Bambu Studio, OrcaSlicer, or PrusaSlicer first.',
    };
  }

  // Handle .3mf or .gcode.3mf archives
  if (lowerName.endsWith('.3mf') || lowerName.endsWith('.gcode.3mf')) {
    return await parse3mfArchive(file);
  }

  // Handle standard .gcode / .gco text files
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        resolve({
          printHours: 0,
          printMinutes: 0,
          modelWeight: 0,
          projectName: cleanProjectNameFromFileName(file.name),
          success: false,
          message: 'Could not read file content.',
        });
        return;
      }
      const parsed = parseGCodeContent(
        text,
        cleanProjectNameFromFileName(file.name)
      );
      resolve(parsed);
    };
    reader.onerror = () => {
      resolve({
        printHours: 0,
        printMinutes: 0,
        modelWeight: 0,
        projectName: cleanProjectNameFromFileName(file.name),
        success: false,
        message: 'Error reading file.',
      });
    };
    reader.readAsText(file);
  });
}
