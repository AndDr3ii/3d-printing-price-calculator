import { BookmarkPlus, Check, Trash2 } from 'lucide-react';
import { useState } from 'react';

export interface SavedProfileItem {
  id: string;
  name: string;
}

interface ProfileManagerProps<T extends SavedProfileItem> {
  label: string;
  placeholder: string;
  profiles: T[];
  builtinProfiles?: T[];
  activeId?: string;
  onSelect: (profile: T) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
}

export function ProfileManager<T extends SavedProfileItem>({
  label,
  placeholder,
  profiles,
  builtinProfiles = [],
  activeId,
  onSelect,
  onSave,
  onDelete,
}: ProfileManagerProps<T>) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setNewName('');
    setIsAdding(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  };

  return (
    <div className="profile-manager">
      <div className="profile-manager-header">
        <span className="profile-manager-label">{label}</span>
        {!isAdding ? (
          <button
            type="button"
            className="btn-ghost-sm"
            onClick={() => setIsAdding(true)}
          >
            {justSaved ? (
              <>
                <Check size={13} /> Saved
              </>
            ) : (
              <>
                <BookmarkPlus size={13} /> Save Current
              </>
            )}
          </button>
        ) : (
          <form className="profile-save-form" onSubmit={handleSave}>
            <input
              type="text"
              className="profile-name-input"
              placeholder={placeholder}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              maxLength={40}
            />
            <button type="submit" className="btn-accent-sm">
              Save
            </button>
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={() => {
                setIsAdding(false);
                setNewName('');
              }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {(builtinProfiles.length > 0 || profiles.length > 0) && (
        <div className="profile-chips">
          {builtinProfiles.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`profile-chip ${activeId === p.id ? 'is-active' : ''}`}
              onClick={() => onSelect(p)}
            >
              {p.name}
            </button>
          ))}
          {profiles.map((p) => (
            <div
              key={p.id}
              className={`profile-chip-custom ${activeId === p.id ? 'is-active' : ''}`}
            >
              <button
                type="button"
                className="profile-chip-select"
                onClick={() => onSelect(p)}
              >
                {p.name}
              </button>
              <button
                type="button"
                className="profile-chip-delete"
                aria-label={`Delete ${p.name}`}
                title={`Delete ${p.name}`}
                onClick={() => onDelete(p.id)}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
