import { useState, useRef, type DragEvent, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  children?: ReactNode;
  label?: string;
  description?: string;
  id: string;
}

export default function DropZone({ onFiles, accept, multiple = true, children, label, description, id }: DropZoneProps) {
  const { t } = useLang();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) onFiles(droppedFiles);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length > 0) onFiles(selectedFiles);
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      aria-label={label ?? t('browseFiles')}
      id={id}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="file-input-hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
      {children ?? (
        <div className="flex flex-col items-center gap-2 py-2">
          <Upload size={28} className="text-muted" />
          <p className="text-sm font-medium">{label ?? t('browseFiles')}</p>
          <p className="text-xs text-muted">{description ?? t('orDragDrop')}</p>
        </div>
      )}
    </div>
  );
}
