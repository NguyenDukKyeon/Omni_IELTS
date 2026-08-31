import { FolderPlus, Layers, Plus, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { SourceCollection } from '../../types/sources';
import { sourceControlId } from './SourceCard';

export interface CollectionDrawerProps {
  collections: readonly SourceCollection[];
  activeCollectionId?: string;
  onSelectCollection: (collectionId?: string) => void;
  onCreateCollection: (name: string) => Promise<void> | void;
}

export function CollectionDrawer({
  collections,
  activeCollectionId,
  onSelectCollection,
  onCreateCollection,
}: CollectionDrawerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a collection name before saving.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onCreateCollection(trimmed);
      setName('');
      setIsCreating(false);
    } catch {
      setError('The collection could not be saved. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <aside className="omni-collection-drawer" aria-label="Source collections">
      <div className="omni-collection-drawer__heading">
        <div>
          <p className="omni-collection-drawer__title">Collections</p>
          <p className="omni-collection-drawer__summary">Keep related sources together.</p>
        </div>
        <Layers aria-hidden="true" className="omni-collection-drawer__icon" />
      </div>

      <button
        type="button"
        className={`omni-collection-drawer__item${!activeCollectionId ? ' is-active' : ''}`}
        aria-pressed={!activeCollectionId}
        data-ux-control="sources.collection.all"
        data-ux-flow="sources.library.filter"
        onClick={() => onSelectCollection(undefined)}
      >
        <span>All sources</span>
        <span>{collections.reduce((count, collection) => count + collection.sourceIds.length, 0) || '—'}</span>
      </button>

      <div className="omni-collection-drawer__list">
        {collections.map((collection) => (
          <button
            type="button"
            key={collection.id}
            className={`omni-collection-drawer__item${activeCollectionId === collection.id ? ' is-active' : ''}`}
            aria-pressed={activeCollectionId === collection.id}
            data-ux-control={sourceControlId('sources.collection.select', collection.id)}
            data-ux-flow="sources.library.filter"
            onClick={() => onSelectCollection(collection.id)}
          >
            <span className="omni-collection-drawer__item-name">
              <span className="omni-collection-drawer__swatch" aria-hidden="true" />
              {collection.name}
            </span>
            <span>{collection.sourceIds.length}</span>
          </button>
        ))}
      </div>

      {isCreating ? (
        <form className="omni-collection-drawer__form" onSubmit={submit} data-ux-control="sources.collection.form" data-ux-flow="sources.collection.create">
          <label>
            <span>Collection name</span>
            <input
              type="text"
              value={name}
              maxLength={80}
              autoFocus
              data-ux-control="sources.collection.name-input"
              data-ux-flow="sources.collection.create"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {error ? <p className="omni-collection-drawer__error" role="alert">{error}</p> : null}
          <div className="omni-collection-drawer__form-actions">
            <button
              type="button"
              className="omni-collection-drawer__cancel"
              data-ux-control="sources.collection.cancel-button"
              data-ux-flow="sources.collection.create"
              onClick={() => { setIsCreating(false); setError(null); }}
            >
              <X aria-hidden="true" />
              Cancel
            </button>
            <button
              type="submit"
              className="omni-collection-drawer__save"
              disabled={isSaving}
              data-ux-control="sources.collection.save-button"
              data-ux-flow="sources.collection.create"
            >
              {isSaving ? 'Saving…' : 'Save collection'}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="omni-collection-drawer__create"
          data-ux-control="sources.collection.create-button"
          data-ux-flow="sources.collection.create"
          onClick={() => { setIsCreating(true); setError(null); }}
        >
          <FolderPlus aria-hidden="true" />
          Create collection
          <Plus aria-hidden="true" />
        </button>
      )}
    </aside>
  );
}
