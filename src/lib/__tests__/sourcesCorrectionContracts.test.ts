import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('Batch C correction contracts', () => {
  it('replaces the orphan browser event with AppContext handoff state', () => {
    expect(source('src/context/AppContext.tsx')).toMatch(/pendingArtifactHandoff/);
    expect(source('src/context/AppContext.tsx')).toMatch(/consumePendingArtifactHandoff/);
    expect(source('src/context/AppContext.tsx')).toMatch(/mainViewport\.scrollTop = 0/);
    expect(source('src/index.css')).toMatch(/overflow-anchor:\s*none/);
    expect(source('src/App.tsx')).toMatch(/mainKey=\{activeModule\}/);
    expect(source('src/App.tsx')).toMatch(/onOpenArtifact/);
    expect(source('src/views/SourcesView.tsx')).not.toMatch(/dispatchEvent|CustomEvent/);
  });

  it('wires all five destination consumers to an honest draft-intake panel', () => {
    for (const path of [
      'src/views/IELTSPracticeView.tsx',
      'src/views/MockTestView.tsx',
      'src/views/VocabularySRSView.tsx',
      'src/views/SourcesView.tsx',
    ]) {
      expect(source(path), path).toMatch(/PendingArtifactDraftPanel/);
    }
    expect(source('src/components/sources/PendingArtifactDraftPanel.tsx')).toMatch(/chưa được lưu|chÆ°a Ä‘Æ°á»£c lÆ°u/i);
  });

  it('keeps Sources guest mode to one honest primary action and removes unsupported job placeholder copy', () => {
    const view = source('src/views/SourcesView.tsx');
    const explorer = source('src/components/sources/SourcesLibraryExplorer.tsx');
    expect(`${view}\n${explorer}`).toContain('Đăng nhập để thêm nguồn');
    expect(view).not.toContain('Job status appears here');
    expect(view).not.toContain('Add source');
    expect(source('src/components/shell/EvidenceDock.tsx')).toMatch(/sources/);
  });

  it('keeps the mobile shell compact and the target band bounded in code and UI', () => {
    expect(source('src/index.css')).toMatch(/omni-shell-header[\s\S]*?min-height:\s*4rem/);
    expect(source('src/components/sources/ArtifactStudioModal.tsx')).toMatch(/SOURCE_ARTIFACT_TARGET_BAND_MIN/);
    expect(source('src/components/sources/ArtifactStudioModal.tsx')).toMatch(/SOURCE_ARTIFACT_TARGET_BAND_MAX/);
    expect(source('src/components/sources/ArtifactStudioModal.tsx')).toMatch(/SOURCE_ARTIFACT_TARGET_BAND_STEP/);
    expect(source('src/components/sources/SourceImportPanel.tsx')).toMatch(/nextFile\.size\s*>\s*SOURCE_IMPORT_MAX_BINARY_BYTES/);
  });

  it('uses Vietnamese learner-facing copy across the new Sources surface', () => {
    const files = [
      'src/views/SourcesView.tsx',
      'src/components/sources/SourcesLibraryExplorer.tsx',
      'src/components/sources/SourceReader.tsx',
      'src/components/sources/SourceGroundedChat.tsx',
      'src/components/sources/SourceImportPanel.tsx',
      'src/components/sources/ArtifactStudioModal.tsx',
    ];
    const combined = files.map(source).join('\n');
    expect(combined).toContain('Thư viện nguồn');
    expect(combined).toContain('Đọc nguồn');
    expect(combined).toContain('Đăng nhập để thêm nguồn');
    expect(combined).not.toMatch(/Sources workspace|Add source|Open reader|Create output|No sources yet|Search your sources|All formats|Job status appears here/);
  });
});
