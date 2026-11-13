import { Check, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { parseGCodeContent } from '../utils/gcodeParser';

interface GCodeUploadProps {
  onAutofill: (data: {
    hours: number;
    minutes: number;
    weight: number;
    slicer?: string;
  }) => void;
}

export function GCodeUpload({ onAutofill }: GCodeUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatusMessage('Reading G-code...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setStatusMessage('Could not read file.');
        setIsSuccess(false);
        return;
      }
      const parsed = parseGCodeContent(text);
      if (parsed.success) {
        setIsSuccess(true);
        setStatusMessage(parsed.message || 'Stats extracted successfully.');
        onAutofill({
          hours: parsed.printHours,
          minutes: parsed.printMinutes,
          weight: parsed.modelWeight,
          slicer: parsed.slicerDetected,
        });
      } else {
        setIsSuccess(false);
        setStatusMessage(
          parsed.message ||
            'Could not find print time or weight comments in this G-code file.'
        );
      }
    };

    reader.onerror = () => {
      setStatusMessage('Error reading file.');
      setIsSuccess(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="gcode-upload-shell">
      <input
        ref={fileInputRef}
        type="file"
        accept=".gcode,.gco,.g"
        className="gcode-hidden-input"
        onChange={handleFileChange}
      />
      <div
        className="gcode-drop-area"
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
          {isSuccess ? <Check size={20} /> : <UploadCloud size={20} />}
        </div>
        <div className="gcode-drop-content">
          <span className="gcode-drop-title">
            {fileName ? fileName : 'Upload Sliced G-Code (.gcode)'}
          </span>
          <span className="gcode-drop-hint">
            {statusMessage
              ? statusMessage
              : 'Autofill Print Time and Model Weight from PrusaSlicer, Cura, Bambu, or Orca'}
          </span>
        </div>
      </div>
    </div>
  );
}
