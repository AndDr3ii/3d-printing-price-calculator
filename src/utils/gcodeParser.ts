import JSZip from 'jszip';
import type {
  FilamentSlotAssignment,
  FilamentSlotUsage,
} from '../types/calculator';

export interface SlicedFileParseResult {
  printHours: number;
  printMinutes: number;
  modelWeight: number; // In grams
  projectName?: string;
  rawTimeSeconds?: number;
  slicerDetected?: string;
  filamentSlots?: FilamentSlotUsage[];
  success: boolean;
  isUnsliced3mf?: boolean;
  message?: string;
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
 * Parses any time string into total seconds.
 * Supports:
 * - Pure integer seconds: "22500", "5430"
 * - Multi-unit strings: "1d 2h 30m 15s", "6h 22m 45s", "35m 20s", "45s", "2h", "2h 30m"
 * - Clock formats: "06:22:45", "35:20"
 */
export function parseTimeStringToSeconds(raw: string): number | null {
  if (!raw) return null;
  const timeStr = raw.trim();
  if (!timeStr) return null;

  // Pure digits: seconds (e.g. "22500")
  if (/^\d+$/.test(timeStr)) {
    const val = parseInt(timeStr, 10);
    return val > 0 ? val : null;
  }

  // Format: HH:MM:SS
  const hhmmss = timeStr.match(/^(\d{1,3}):(\d{2}):(\d{2})$/);
  if (hhmmss) {
    const total =
      parseInt(hhmmss[1], 10) * 3600 +
      parseInt(hhmmss[2], 10) * 60 +
      parseInt(hhmmss[3], 10);
    return total > 0 ? total : null;
  }

  // Format: MM:SS
  const mmss = timeStr.match(/^(\d{1,3}):(\d{2})$/);
  if (mmss) {
    const total = parseInt(mmss[1], 10) * 60 + parseInt(mmss[2], 10);
    return total > 0 ? total : null;
  }

  // Text format: Xd Xh Xm Xs, or variants (case insensitive)
  const days = (timeStr.match(/(\d+)\s*d(?:ays?)?/i) || [])[1];
  const hours = (timeStr.match(/(\d+)\s*h(?:(?:ou)?rs?)?/i) || [])[1];
  const mins = (timeStr.match(/(\d+)\s*m(?:in(?:ute)?s?)?/i) || [])[1];
  const secs = (timeStr.match(/(\d+)\s*s(?:ec(?:ond)?s?)?/i) || [])[1];

  if (days || hours || mins || secs) {
    const totalSecs =
      (days ? parseInt(days, 10) * 86400 : 0) +
      (hours ? parseInt(hours, 10) * 3600 : 0) +
      (mins ? parseInt(mins, 10) * 60 : 0) +
      (secs ? parseInt(secs, 10) : 0);
    return totalSecs > 0 ? totalSecs : null;
  }

  return null;
}

/**
 * Converts total seconds to printHours and printMinutes,
 * rounding seconds >= 30 up to the next minute.
 */
export function secondsToHoursAndMinutes(totalSeconds: number): {
  printHours: number;
  printMinutes: number;
} {
  if (!totalSeconds || totalSeconds <= 0) {
    return { printHours: 0, printMinutes: 0 };
  }
  const totalMinutes = Math.round(totalSeconds / 60);
  const printHours = Math.floor(totalMinutes / 60);
  const printMinutes = totalMinutes % 60;
  return { printHours, printMinutes };
}

/**
 * Extracts print time in seconds from Bambu Studio / OrcaSlicer slice_info.config XML.
 * Checks:
 * 1. <metadata key="prediction" value="..."/>
 * 2. <metadata key="estimated_time" value="..."/>
 * 3. <metadata key="time" value="..."/>
 * 4. <plate ... prediction="...">
 * 5. <prediction>...</prediction>
 * 6. prediction="..." attribute
 */
export function extractSecondsFromSliceInfoXml(xmlText: string): number | null {
  if (!xmlText) return null;

  // 1. <metadata key="prediction" value="22500"/>
  const metaKeyPredMatch = xmlText.match(
    /<metadata\b[^>]*\bkey\s*=\s*["'](?:prediction|estimated_time|time|print_time)["'][^>]*\bvalue\s*=\s*["']([^"']+)["']/i
  );
  if (metaKeyPredMatch && metaKeyPredMatch[1]) {
    const parsed = parseTimeStringToSeconds(metaKeyPredMatch[1]);
    if (parsed && parsed > 0) return parsed;
  }

  // 2. <metadata value="22500" key="prediction"/> (reversed attribute order)
  const metaValPredMatch = xmlText.match(
    /<metadata\b[^>]*\bvalue\s*=\s*["']([^"']+)["'][^>]*\bkey\s*=\s*["'](?:prediction|estimated_time|time|print_time)["']/i
  );
  if (metaValPredMatch && metaValPredMatch[1]) {
    const parsed = parseTimeStringToSeconds(metaValPredMatch[1]);
    if (parsed && parsed > 0) return parsed;
  }

  // 3. <plate ... prediction="5430"> or <plate prediction="5430">
  const plateMatches = Array.from(
    xmlText.matchAll(/<plate\b[^>]*\bprediction\s*=\s*["']([^"']+)["']/gi)
  );
  if (plateMatches.length > 0) {
    let sum = 0;
    for (const m of plateMatches) {
      const parsed = parseTimeStringToSeconds(m[1]);
      if (parsed && parsed > 0) sum += parsed;
    }
    if (sum > 0) return sum;
  }

  // 4. prediction="22500" or <prediction>22500</prediction>
  const genericPredMatch =
    xmlText.match(/\bprediction\s*=\s*["']([^"']+)["']/i) ||
    xmlText.match(/<prediction>([^<]+)<\/prediction>/i);
  if (genericPredMatch && genericPredMatch[1]) {
    const parsed = parseTimeStringToSeconds(genericPredMatch[1]);
    if (parsed && parsed > 0) return parsed;
  }

  // 5. estimated_time="22500" or <estimated_time>22500</estimated_time>
  const genericEstMatch =
    xmlText.match(/\bestimated_time\s*=\s*["']([^"']+)["']/i) ||
    xmlText.match(/<estimated_time>([^<]+)<\/estimated_time>/i);
  if (genericEstMatch && genericEstMatch[1]) {
    const parsed = parseTimeStringToSeconds(genericEstMatch[1]);
    if (parsed && parsed > 0) return parsed;
  }

  return null;
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

  // Deduplicate by slot id (summing grams if across multiple plates)
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
  const lines = content.split(/\r?\n/).slice(0, 600);
  let weights: number[] = [];
  let colors: string[] = [];
  let types: string[] = [];

  for (const line of lines) {
    if (weights.length === 0) {
      const wMatch = line.match(
        /;\s*(?:filament used \[g\]|filament_used_g|total filament used \[g\])\s*=\s*([0-9.,\s]+)/i
      );
      if (wMatch && wMatch[1]) {
        weights = wMatch[1]
          .split(',')
          .map((v) => parseFloat(v.trim()))
          .filter((v) => Number.isFinite(v));
      }
    }

    if (colors.length === 0) {
      const cMatch = line.match(
        /;\s*(?:filament_colour|filament_colors?)\s*=\s*([#0-9a-fA-F;,_\s]+)/i
      );
      if (cMatch && cMatch[1]) {
        colors = cMatch[1]
          .split(/[;,]/)
          .map((c) => c.trim())
          .filter(Boolean);
      }
    }

    if (types.length === 0) {
      const tMatch = line.match(
        /;\s*(?:filament_type|filament_types)\s*=\s*([0-9a-zA-Z;,_\s]+)/i
      );
      if (tMatch && tMatch[1]) {
        types = tMatch[1]
          .split(/[;,]/)
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
  // Scan first 500 lines and last 800 lines
  const headLines = lines.slice(0, 500);
  const tailLines = lines.slice(-800);
  const targetLines = [...headLines, ...tailLines];

  let detectedSeconds: number | null = null;
  let detectedGrams: number | null = null;
  let detectedSlicer: string | undefined = undefined;

  // Exact Bambu Studio, OrcaSlicer, PrusaSlicer, and Cura patterns
  const timeRegexes = [
    /;\s*total estimated time\s*[:=]\s*(.*)/i,
    /;\s*model printing time\s*[:=]\s*(.*)/i,
    /;\s*plate printing time\s*[:=]\s*(.*)/i,
    /;\s*estimated printing time(?:\s*\([^)]*\))?\s*[:=]\s*(.*)/i,
    /;\s*print_time\s*[:=]\s*(.*)/i,
    /;\s*total time\s*[:=]\s*(.*)/i,
    /;\s*TIME\s*:\s*(\d+)/i, // Cura seconds
  ];

  // Filament Weight regexes
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

    // Time parsing
    if (detectedSeconds === null) {
      for (const re of timeRegexes) {
        const tMatch = line.match(re);
        if (tMatch && tMatch[1]) {
          const parsed = parseTimeStringToSeconds(tMatch[1]);
          if (parsed && parsed > 0) {
            detectedSeconds = parsed;
            break;
          }
        }
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

  const { printHours, printMinutes } = secondsToHoursAndMinutes(
    detectedSeconds || 0
  );
  const filamentSlots = extractFilamentSlotsFromGCode(content);

  const success =
    (detectedSeconds !== null && detectedSeconds > 0) ||
    (detectedGrams !== null && detectedGrams > 0);

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
 * 3. Robustly falls back between config and gcode so neither time nor weight is lost
 * 4. Detects if it's an unsliced CAD/geometry .3mf (prompting the user)
 */
export async function parse3mfArchive(
  file: File
): Promise<SlicedFileParseResult> {
  const cleanName = cleanProjectNameFromFileName(file.name);

  try {
    const zip = await JSZip.loadAsync(file);

    let seconds: number | null = null;
    let totalGrams: number | null = null;
    let filamentSlots: FilamentSlotUsage[] = [];
    let detectedSlicer = 'Bambu Studio / OrcaSlicer';

    // 1. Look for Bambu Studio / OrcaSlicer slice_info.config
    const sliceInfoFile =
      zip.file('Metadata/slice_info.config') ||
      zip.file(/.*slice_info\.config$/i)[0];

    if (sliceInfoFile) {
      const xmlText = await sliceInfoFile.async('text');

      // Extract print duration in seconds
      seconds = extractSecondsFromSliceInfoXml(xmlText);

      // Extract weight="14.52" across plates/filaments
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

      // Check for flush / purge weight if separated
      const flushMatches = Array.from(
        xmlText.matchAll(/flush_weight\s*=\s*["']([0-9.]+)["']/gi)
      );
      if (flushMatches.length > 0) {
        for (const m of flushMatches) {
          const val = parseFloat(m[1]);
          if (Number.isFinite(val)) totalGrams = (totalGrams || 0) + val;
        }
      }

      filamentSlots = extractFilamentSlotsFromXml(xmlText);
      if ((totalGrams === null || totalGrams === 0) && filamentSlots.length > 0) {
        totalGrams = filamentSlots.reduce((acc, s) => acc + s.usedGrams, 0);
      }
    }

    // 2. Fallback / Augment with any internal .gcode file (e.g. Metadata/plate_1.gcode or plate_*.gcode)
    // If seconds was not in slice_info.config, or if weight was missing, inspect the internal gcode
    if (seconds === null || seconds === 0 || totalGrams === null || totalGrams === 0) {
      const gcodeFiles = zip.file(/.*\.gcode$/i);
      if (gcodeFiles && gcodeFiles.length > 0) {
        // Read the primary plate gcode
        const primaryGcode = gcodeFiles[0];
        const gcodeText = await primaryGcode.async('text');
        const gcodeParsed = parseGCodeContent(gcodeText, cleanName);

        if (gcodeParsed.slicerDetected) {
          detectedSlicer = gcodeParsed.slicerDetected;
        }

        // Augment seconds if missing
        if ((seconds === null || seconds === 0) && gcodeParsed.rawTimeSeconds) {
          seconds = gcodeParsed.rawTimeSeconds;
        }

        // Augment weight if missing
        if ((totalGrams === null || totalGrams === 0) && gcodeParsed.modelWeight > 0) {
          totalGrams = gcodeParsed.modelWeight;
        }

        // Augment slots if missing
        if (filamentSlots.length === 0 && gcodeParsed.filamentSlots && gcodeParsed.filamentSlots.length > 0) {
          filamentSlots = gcodeParsed.filamentSlots;
        }
      }
    }

    // If either time or grams was found, return success!
    if ((seconds !== null && seconds > 0) || (totalGrams !== null && totalGrams > 0)) {
      const { printHours, printMinutes } = secondsToHoursAndMinutes(seconds || 0);
      const finalWeight = totalGrams ? Math.round(totalGrams * 10) / 10 : 0;
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
        slicerDetected: detectedSlicer,
        filamentSlots: filamentSlots.length > 0 ? filamentSlots : undefined,
        success: true,
        message: `Autofilled from ${detectedSlicer} .3mf: ${printHours}h ${printMinutes}m, ${finalWeight}g${slotSummary}`,
      };
    }

    // 3. If neither slice_info.config nor .gcode was found with stats, it's an unsliced CAD .3mf
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
        'You uploaded a raw 3D model (.stl). Please slice it in your 3D slicer (Bambu Studio, OrcaSlicer, PrusaSlicer, or Cura) and upload the exported .gcode or .gcode.3mf file.',
    };
  }

  // Handle .3mf and .gcode.3mf ZIP archives
  if (lowerName.endsWith('.3mf') || lowerName.endsWith('.gcode.3mf')) {
    return parse3mfArchive(file);
  }

  // Handle standard .gcode / .gco text files
  const cleanName = cleanProjectNameFromFileName(file.name);
  const text = await file.text();
  return parseGCodeContent(text, cleanName);
}
