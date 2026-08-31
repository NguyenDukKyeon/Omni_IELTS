import { FilePlus2, Library, PanelRight, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getSourceVersion,
  listSourcesLibrary,
  SourcesApiError,
  type SourceImportResponse,
} from '../lib/sources/sourcesApi';
import { getSession } from '../services/supabase';
import { sourcesStorage } from '../services/sourcesStorage';
import type { ModuleId } from '../types';
import type { SourceCollection, SourceRecord, SourceSpan, SourceVersion } from '../types/sources';
import { ArtifactStudioModal } from '../components/sources/ArtifactStudioModal';
import { SourceGroundedChat } from '../components/sources/SourceGroundedChat';
import { SourceImportPanel } from '../components/sources/SourceImportPanel';
import { SourceReader, type SourceReaderState } from '../components/sources/SourceReader';
import { SourcesLibraryExplorer, type SourcesLibraryExplorerState } from '../components/sources/SourcesLibraryExplorer';
import type { DestinationHandoffResult } from '../lib/sources/destinationHandoff';

type SourcesViewTab = 'library' | 'reader' | 'create';

const TABS: Array<{ id: SourcesViewTab; label: string; controlId: string }> = [
  { id: 'library', label: 'Library', controlId: 'sources.view.tab-library' },
  { id: 'reader', label: 'Reader & Chat', controlId: 'sources.view.tab-reader' },
  { id: 'create', label: 'Create', controlId: 'sources.view.tab-create' },
];

function libraryStateForError(error: unknown): SourcesLibraryExplorerState {
  if (error instanceof SourcesApiError && error.statusLabel === 'auth_required') return 'unavailable';
  if (error instanceof SourcesApiError && error.statusLabel === 'feature_disabled') return 'unavailable';
  return 'retryable_error';
}

function readerStateForError(error: unknown): SourceReaderState {
  if (error instanceof SourcesApiError && error.statusLabel === 'auth_required') return 'unavailable';
  return 'unavailable';
}

function collectionId(): string {
  return globalThis.crypto?.randomUUID?.() || `collection-${Date.now()}`;
}

function collectionNow(): string {
  return new Date().toISOString();
}

export interface SourcesViewProps {
  onNavigate?: (moduleId: ModuleId) => void;
}

export function SourcesView({ onNavigate }: SourcesViewProps) {
  const [records, setRecords] = useState<SourceRecord[]>([]);
  const [collections, setCollections] = useState<SourceCollection[]>([]);
  const [libraryState, setLibraryState] = useState<SourcesLibraryExplorerState>('loading');
  const [libraryError, setLibraryError] = useState<string>();
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string>();
  const [readerVersion, setReaderVersion] = useState<SourceVersion>();
  const [readerState, setReaderState] = useState<SourceReaderState>('unavailable');
  const [readerError, setReaderError] = useState<string>();
  const [selectedSpan, setSelectedSpan] = useState<SourceSpan>();
  const [activeTab, setActiveTab] = useState<SourcesViewTab>('library');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [artifactSource, setArtifactSource] = useState<SourceRecord>();
  const [artifactVersion, setArtifactVersion] = useState<SourceVersion>();
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);

  const activeSource = useMemo(
    () => records.find((record) => record.id === activeSourceId),
    [activeSourceId, records],
  );
  const selectedVersionIds = useMemo(
    () => records
      .filter((record) => selectedSourceIds.includes(record.id) && record.processingState === 'ready' && record.currentVersionId)
      .map((record) => record.currentVersionId),
    [records, selectedSourceIds],
  );

  const loadLibrary = useCallback(async () => {
    setLibraryState('loading');
    setLibraryError(undefined);
    try {
      const response = await listSourcesLibrary();
      setRecords(response.records);
      setCollections(response.collections);
      setLibraryState(response.records.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      setRecords([]);
      setCollections([]);
      setLibraryState(libraryStateForError(error));
      setLibraryError(error instanceof SourcesApiError && error.statusLabel === 'auth_required'
        ? 'Guest mode keeps this cloud library empty. Sign in to import or sync private Sources.'
        : 'The private Sources library could not be loaded. Retry without losing your local selection.');
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  const loadReaderVersion = useCallback(async (source: SourceRecord) => {
    if (!source.currentVersionId || source.processingState !== 'ready') {
      setReaderVersion(undefined);
      setReaderState('unavailable');
      return;
    }
    setReaderState('loading');
    setReaderError(undefined);
    try {
      const response = await getSourceVersion(source.currentVersionId);
      setReaderVersion(response.sourceVersion);
      setReaderState('ready');
    } catch (error) {
      setReaderVersion(undefined);
      setReaderState(readerStateForError(error));
      setReaderError(error instanceof SourcesApiError ? error.userMessageVi : undefined);
    }
  }, []);

  const openSource = (source: SourceRecord) => {
    setActiveSourceId(source.id);
    setSelectedSpan(undefined);
    setActiveTab('reader');
    void loadReaderVersion(source);
  };

  const openArtifact = (source: SourceRecord) => {
    setArtifactSource(source);
    setArtifactVersion(undefined);
    setIsArtifactOpen(true);
    const knownVersion = source.currentVersionId === readerVersion?.id && readerVersion.sourceId === source.id
      ? readerVersion
      : undefined;
    if (knownVersion) {
      setArtifactVersion(knownVersion);
      return;
    }
    if (!source.currentVersionId) return;
    void getSourceVersion(source.currentVersionId)
      .then((response) => setArtifactVersion(response.sourceVersion))
      .catch(() => setArtifactVersion(undefined));
  };

  const handleImport = (response: SourceImportResponse) => {
    if (response.sourceRecord) {
      setRecords((current) => [response.sourceRecord!, ...current.filter((record) => record.id !== response.sourceRecord!.id)]);
      setActiveSourceId(response.sourceRecord.id);
    }
    if (response.sourceVersion) setReaderVersion(response.sourceVersion);
    setLibraryState('ready');
    setIsImportOpen(false);
  };

  const handleCreateCollection = async (name: string) => {
    const session = await getSession();
    if (!session?.user?.id) throw new SourcesApiError({
      statusCode: 401,
      statusLabel: 'auth_required',
      code: 'AUTH_REQUIRED',
      userMessageVi: 'Đăng nhập để lưu bộ sưu tập riêng.',
    });
    const timestamp = collectionNow();
    const saved = await sourcesStorage.saveCollection({
      id: collectionId(),
      userId: session.user.id,
      name,
      color: 'vermilion',
      icon: 'folder',
      sourceIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      lastUsedAt: timestamp,
    });
    setCollections((current) => [saved, ...current]);
  };

  const openArtifactForActiveSource = () => {
    if (activeSource) openArtifact(activeSource);
  };

  const openDestination = (handoff: DestinationHandoffResult & { navigable: true }) => {
    setIsArtifactOpen(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omni:sources-artifact-handoff', {
        detail: handoff.draftRef,
      }));
    }
    onNavigate?.(handoff.targetModule);
  };

  const contextLabel = selectedVersionIds.length === 0
    ? 'No ready source version selected'
    : `Context: ${selectedVersionIds.length} selected source version${selectedVersionIds.length === 1 ? '' : 's'}`;

  return (
    <section className="omni-sources-view" data-ux-scope="sources-library-v2" aria-labelledby="sources-view-title">
      <header className="omni-sources-view__header">
        <div>
          <h1 id="sources-view-title">Sources workspace</h1>
          <p>Read evidence, ask only what your sources support, and create one destination draft at a time.</p>
        </div>
        <div className="omni-sources-view__header-mark" aria-hidden="true"><Library /></div>
      </header>

      <nav className="omni-sources-view__tabs" role="tablist" aria-label="Sources workspace views">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            data-mobile-active={activeTab === tab.id ? 'true' : 'false'}
            data-ux-control={tab.controlId}
            data-ux-flow="sources.view.tabs"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="omni-sources-view__workspace">
        <div className="omni-sources-view__pane omni-sources-view__pane--library" data-mobile-active={activeTab === 'library' ? 'true' : 'false'}>
          <SourcesLibraryExplorer
            sources={records}
            collections={collections}
            state={libraryState}
            errorMessage={libraryError}
            selectedSourceIds={selectedSourceIds}
            onSelectedSourceIdsChange={setSelectedSourceIds}
            onOpenSource={openSource}
            onCreateArtifact={openArtifact}
            onCreateCollection={handleCreateCollection}
            onRetry={() => void loadLibrary()}
            onAddSource={() => setIsImportOpen(true)}
          />
          {isImportOpen ? <SourceImportPanel onClose={() => setIsImportOpen(false)} onImported={handleImport} /> : null}
        </div>

        <div className="omni-sources-view__pane omni-sources-view__pane--reader" data-mobile-active={activeTab === 'reader' ? 'true' : 'false'}>
          {activeSource ? (
            <SourceReader
              record={activeSource}
              version={readerVersion}
              selectedSpan={selectedSpan}
              state={readerState}
              onSpanChange={setSelectedSpan}
              onRetry={() => void loadReaderVersion(activeSource)}
            />
          ) : (
            <div className="omni-sources-view__empty-pane" role="status">
              <h2>No source selected</h2>
              <p>Open a ready source from Library to read its validated blocks.</p>
            </div>
          )}
          {readerError ? <p className="omni-sources-view__pane-error" role="status">{readerError}</p> : null}
          <SourceGroundedChat selectedVersionIds={selectedVersionIds} selectedSpan={selectedSpan} contextLabel={contextLabel} />
        </div>

        <aside className="omni-sources-view__pane omni-sources-view__pane--create" data-mobile-active={activeTab === 'create' ? 'true' : 'false'} aria-labelledby="sources-create-title">
          <div className="omni-sources-create-context">
            <div className="omni-sources-create-context__heading">
              <div>
                <p className="omni-sources-create-context__label">Create / evidence</p>
                <h2 id="sources-create-title">One source. One destination.</h2>
              </div>
              <PanelRight aria-hidden="true" />
            </div>
            {activeSource ? (
              <div className="omni-sources-create-context__source">
                <strong>{activeSource.title}</strong>
                <span>{activeSource.processingState === 'ready' ? 'Ready source version' : 'No ready source version'}</span>
                <span>{selectedSpan?.sourceVersionId === activeSource.currentVersionId ? 'Selected span is active' : 'Whole version is available when ready'}</span>
              </div>
            ) : (
              <div className="omni-sources-view__empty-pane" role="status">
                <FilePlus2 aria-hidden="true" />
                <h3>Choose a source first</h3>
                <p>Artifact Studio will keep the source selection here until you choose a destination.</p>
              </div>
            )}
            {activeSource ? (
              <button
                type="button"
                className="omni-sources-create-context__open"
                disabled={activeSource.processingState !== 'ready' || !activeSource.currentVersionId}
                data-ux-control="sources.view.open-create"
                data-ux-flow="sources.artifact.open-modal"
                onClick={openArtifactForActiveSource}
              >
                <FilePlus2 aria-hidden="true" />
                Create from this source
              </button>
            ) : null}
            <p className="omni-sources-create-context__rule">Sources prepares a validated draft. Practice, Mock, Vocabulary, or Notes persists it only after you open it.</p>
          </div>
          <div className="omni-sources-create-context__jobs" role="status">
            <RefreshCw aria-hidden="true" />
            <span>Job status appears here after a real server request.</span>
          </div>
        </aside>
      </div>

      {artifactSource ? (
        <ArtifactStudioModal
          isOpen={isArtifactOpen}
          source={artifactSource}
          version={artifactVersion}
          selectedSpan={artifactSource.id === activeSourceId ? selectedSpan : undefined}
          onClose={() => setIsArtifactOpen(false)}
          onOpenArtifact={(handoff) => {
            if (handoff.navigable) openDestination(handoff);
          }}
          onCreateAnother={() => setActiveTab('create')}
        />
      ) : null}
    </section>
  );
}
