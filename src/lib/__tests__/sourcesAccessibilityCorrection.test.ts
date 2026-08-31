import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('Sources correction keyboard and focus contracts', () => {
  it('keeps import controls labelled and the client file-size guard before submit', () => {
    const panel = source('src/components/sources/SourceImportPanel.tsx');
    expect(panel).toMatch(/<label>/);
    expect(panel).toMatch(/type="file"/);
    expect(panel).toMatch(/nextFile\.size\s*>\s*SOURCE_IMPORT_MAX_BINARY_BYTES/);
    expect(panel).toMatch(/data-ux-control="sources\.import\.submit"/);
  });

  it('keeps reader span selection keyboard reachable and tied to source provenance', () => {
    const reader = source('src/components/sources/SourceReader.tsx');
    expect(reader).toMatch(/type="button"/);
    expect(reader).toMatch(/aria-pressed=\{blockSelected\}/);
    expect(reader).toMatch(/sources\.reader\.select-span/);
    expect(reader).toMatch(/sourceVersionId: version\.id/);
  });

  it('keeps chat, artifact dialog, destination handoff, and mobile tabs accessible', () => {
    const chat = source('src/components/sources/SourceGroundedChat.tsx');
    const dialog = source('src/components/sources/ArtifactStudioModal.tsx');
    const handoff = source('src/components/sources/PendingArtifactDraftPanel.tsx');
    const tabs = source('src/views/SourcesView.tsx');

    expect(chat).toMatch(/htmlFor="sources-chat-question"/);
    expect(chat).toMatch(/data-ux-control="sources\.chat\.send"/);
    expect(dialog).toMatch(/role="dialog"/);
    expect(dialog).toMatch(/event\.key === 'Escape'/);
    expect(dialog).toMatch(/event\.key !== 'Tab'/);
    expect(dialog).toMatch(/handoffNavigationRef/);
    expect(handoff).toMatch(/role="status"/);
    expect(handoff).toMatch(/chưa được lưu|chÆ°a Ä‘Æ°á»£c lÆ°u/i);
    expect(tabs).toMatch(/role="tablist"/);
    expect(tabs).toMatch(/role="tab"/);
    expect(tabs).toMatch(/aria-selected=\{activeTab === tab\.id\}/);
  });
});
