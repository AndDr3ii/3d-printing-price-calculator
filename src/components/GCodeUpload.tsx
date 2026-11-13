import { AlertCircle, Check, Loader2, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { parseUploadedSlicedFile } from '../utils/gcodeParser';

interface GCodeUploadProps {
  onAutofill: (data: {
    hours: number;
    minutes: number;
    weight: number;
    slicer?: string;
    projectName?: string;
  }) => void;
}

export function GCodeUpload({ onAutofill }: GCodeUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'idle' | 'loading' | 'success' | 'warning' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatusMessage('Reading and inspecting sliced archive...');
    setStatusType('loading');

    try {
      const parsed = await parseUploadedSlicedFile(file);

      if (parsed.success) {
        setStatusType('success');
        setStatusMessage(parsed.message || 'Stats extracted successfully.');
        onAutofill({
          hours: parsed.printHours,
          minutes: parsed.printMinutes,
          weight: parsed.modelWeight,
          slicer: parsed.slicerDetected,
          projectName: parsed.projectName,
        });
      } else if (parsed.isUnsliced3mf) {
        setStatusType('warning');
        setStatusMessage(
          parsed.message ||
            'This .3mf file is an unsliced 3D model. Please slice it in Bambu Studio or OrcaSlicer first so print time and filament weight exist.'
        );
      } else {
        setStatusType('error');
        setStatusMessage(
          parsed.message ||
            'Could not find print time or filament weight metadata in this file.'
        );
      }
    } catch {
      setStatusType('error');
      setStatusMessage('Unexpected error reading the file.');
    }
  };

  return (
    <div className="gcode-upload-shell">
      <input
        ref={fileInputRef}
        type="file"
        accept=".gcode,.gco,.g,.3mf,.gcode.3mf,.stl"
        className="gcode-hidden-input"
        onChange={handleFileChange}
      />
      <div
        className={`gcode-drop-area ${
          statusType === 'success'
            ? 'is-success'
            : statusType === 'warning' || statusType === 'error'
              ? 'is-alert'
              : ''
        }`}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            fileInputRef.current?.click();
          }
        }}
      >
        <div className="gcode-drop-icon">
          {statusType === 'loading' ? (
            <Loader2 size={20} className="spin-animate" />
          ) : statusType === 'success' ? (
            <Check size={20} />
          ) : statusType === 'warning' || statusType === 'error' ? (
            <AlertCircle size={20} />
          ) : (
            <UploadCloud size={20} />
          )}
        </div>
        <div className="gcode-drop-content">
          <span className="gcode-drop-title">
            {fileName ? fileName : 'Upload Sliced File (.gcode, .gcode.3mf, .3mf)'}
          </span>
          <span
            className={`gcode-drop-hint ${
              statusType === 'warning' || statusType === 'error'
                ? 'hint-alert'
                : statusType === 'success'
                  ? 'hint-success'
                  : ''
            }`}
          >
            {statusMessage
              ? statusMessage
              : 'Autofill Print Time, Weight, and Project Name from Bambu Studio, OrcaSlicer, PrusaSlicer, or Cura'}
          </span>
        </div>
      </div>
    </div>
  );
}
