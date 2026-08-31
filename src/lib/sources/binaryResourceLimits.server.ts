import { SOURCE_IMPORT_MAX_BINARY_BYTES } from './importLimits';

export const SOURCE_IMPORT_MAX_DOCX_ENTRIES = 512;
export const SOURCE_IMPORT_MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES = 16 * 1024 * 1024;
export const SOURCE_IMPORT_MAX_DOCX_ENTRY_UNCOMPRESSED_BYTES = 4 * 1024 * 1024;
export const SOURCE_IMPORT_MAX_DOCX_COMPRESSION_RATIO = 100;
export const SOURCE_IMPORT_MAX_BINARY_EXTRACTED_TEXT_CHARS = 200_000;
export const SOURCE_IMPORT_MAX_BINARY_EXTRACTED_BLOCKS = 2_000;
export const SOURCE_IMPORT_MAX_PDF_PAGES = 100;
export const SOURCE_IMPORT_PDF_TIMEOUT_MS = 15_000;
export const SOURCE_IMPORT_BINARY_WORKER_MAX_OLD_GENERATION_MB = 256;

const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_SIGNATURE = 0x04034b50;
const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
const MAX_ZIP_NAME_BYTES = 1_024;
const MAX_ZIP_EXTRA_BYTES = 4_096;
const MAX_ZIP_COMMENT_BYTES = 4_096;

export type DocxArchiveInspection =
  | {
      ok: true;
      entryCount: number;
      totalUncompressedBytes: number;
    }
  | {
      ok: false;
      code:
        | 'DOCX_ARCHIVE_MALFORMED'
        | 'DOCX_ARCHIVE_ENCRYPTED'
        | 'DOCX_ARCHIVE_MULTI_DISK'
        | 'DOCX_ARCHIVE_UNSUPPORTED'
        | 'DOCX_ENTRY_COUNT_EXCEEDED'
        | 'DOCX_ENTRY_SIZE_EXCEEDED'
        | 'DOCX_TOTAL_SIZE_EXCEEDED'
        | 'DOCX_COMPRESSION_RATIO_EXCEEDED'
        | 'DOCX_COMPRESSION_UNSUPPORTED';
    };

export type DocxArchiveErrorCode = Exclude<DocxArchiveInspection, { ok: true }>['code'];

const DOCX_RESOURCE_LIMIT_CODES = new Set([
  'DOCX_ENTRY_COUNT_EXCEEDED',
  'DOCX_ENTRY_SIZE_EXCEEDED',
  'DOCX_TOTAL_SIZE_EXCEEDED',
  'DOCX_COMPRESSION_RATIO_EXCEEDED',
]);

export function isDocxResourceLimitCode(code: DocxArchiveErrorCode): boolean {
  return DOCX_RESOURCE_LIMIT_CODES.has(code);
}

function readU16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]
    | (bytes[offset + 1] << 8)
    | (bytes[offset + 2] << 16)
    | (bytes[offset + 3] << 24)) >>> 0;
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const first = Math.max(0, bytes.length - (22 + 0xffff));
  for (let offset = bytes.length - 22; offset >= first; offset -= 1) {
    if (readU32(bytes, offset) === ZIP_EOCD_SIGNATURE) return offset;
  }
  return -1;
}

function hasSignature(bytes: Uint8Array, signature: number): boolean {
  for (let offset = 0; offset + 4 <= bytes.length; offset += 1) {
    if (readU32(bytes, offset) === signature) return true;
  }
  return false;
}

function malformed(): DocxArchiveInspection {
  return { ok: false, code: 'DOCX_ARCHIVE_MALFORMED' };
}

export function inspectDocxArchive(content: Uint8Array): DocxArchiveInspection {
  if (content.byteLength > SOURCE_IMPORT_MAX_BINARY_BYTES) return { ok: false, code: 'DOCX_TOTAL_SIZE_EXCEEDED' };
  if (content.byteLength < 22) return malformed();

  const eocdOffset = findEndOfCentralDirectory(content);
  if (eocdOffset < 0) return malformed();
  const commentLength = readU16(content, eocdOffset + 20);
  if (commentLength > MAX_ZIP_COMMENT_BYTES) return { ok: false, code: 'DOCX_ARCHIVE_UNSUPPORTED' };
  if (eocdOffset + 22 + commentLength !== content.length) return malformed();

  const diskNumber = readU16(content, eocdOffset + 4);
  const centralDirectoryDisk = readU16(content, eocdOffset + 6);
  const entriesOnDisk = readU16(content, eocdOffset + 8);
  const entryCount = readU16(content, eocdOffset + 10);
  const centralDirectorySize = readU32(content, eocdOffset + 12);
  const centralDirectoryOffset = readU32(content, eocdOffset + 16);

  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== entryCount) {
    return { ok: false, code: 'DOCX_ARCHIVE_MULTI_DISK' };
  }
  if (entryCount === 0xffff || centralDirectorySize === 0xffffffff || centralDirectoryOffset === 0xffffffff) {
    return { ok: false, code: 'DOCX_ARCHIVE_UNSUPPORTED' };
  }
  if (entryCount > SOURCE_IMPORT_MAX_DOCX_ENTRIES) {
    return { ok: false, code: 'DOCX_ENTRY_COUNT_EXCEEDED' };
  }

  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  if (!Number.isSafeInteger(centralDirectoryEnd) || centralDirectoryOffset < 0 || centralDirectoryEnd > eocdOffset) {
    return malformed();
  }
  if (hasSignature(content, ZIP64_EOCD_SIGNATURE) || hasSignature(content, ZIP64_LOCATOR_SIGNATURE)) {
    return { ok: false, code: 'DOCX_ARCHIVE_UNSUPPORTED' };
  }

  let offset = centralDirectoryOffset;
  let totalUncompressedBytes = 0;
  const dataRanges: Array<{ start: number; end: number }> = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > centralDirectoryEnd || readU32(content, offset) !== ZIP_CENTRAL_SIGNATURE) return malformed();
    const flags = readU16(content, offset + 8);
    const compressionMethod = readU16(content, offset + 10);
    const compressedSize = readU32(content, offset + 20);
    const uncompressedSize = readU32(content, offset + 24);
    const filenameLength = readU16(content, offset + 28);
    const extraLength = readU16(content, offset + 30);
    const entryCommentLength = readU16(content, offset + 32);
    const diskStart = readU16(content, offset + 34);
    const localHeaderOffset = readU32(content, offset + 42);
    const entryEnd = offset + 46 + filenameLength + extraLength + entryCommentLength;

    if (filenameLength > MAX_ZIP_NAME_BYTES || extraLength > MAX_ZIP_EXTRA_BYTES || entryCommentLength > MAX_ZIP_COMMENT_BYTES) {
      return { ok: false, code: 'DOCX_ARCHIVE_UNSUPPORTED' };
    }
    if (entryEnd > centralDirectoryEnd) return malformed();
    if (diskStart !== 0) return { ok: false, code: 'DOCX_ARCHIVE_MULTI_DISK' };
    if ((flags & 0x0001) !== 0 || (flags & 0x0040) !== 0) return { ok: false, code: 'DOCX_ARCHIVE_ENCRYPTED' };
    if ((flags & ~(0x0008 | 0x0800)) !== 0) return { ok: false, code: 'DOCX_ARCHIVE_UNSUPPORTED' };
    if (compressionMethod !== 0 && compressionMethod !== 8) return { ok: false, code: 'DOCX_COMPRESSION_UNSUPPORTED' };
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localHeaderOffset === 0xffffffff) {
      return { ok: false, code: 'DOCX_ARCHIVE_UNSUPPORTED' };
    }
    if (uncompressedSize > SOURCE_IMPORT_MAX_DOCX_ENTRY_UNCOMPRESSED_BYTES) {
      return { ok: false, code: 'DOCX_ENTRY_SIZE_EXCEEDED' };
    }
    totalUncompressedBytes += uncompressedSize;
    if (totalUncompressedBytes > SOURCE_IMPORT_MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES) {
      return { ok: false, code: 'DOCX_TOTAL_SIZE_EXCEEDED' };
    }
    if (uncompressedSize > 0 && compressedSize === 0) {
      return { ok: false, code: 'DOCX_COMPRESSION_RATIO_EXCEEDED' };
    }
    if (compressedSize > 0 && uncompressedSize / compressedSize > SOURCE_IMPORT_MAX_DOCX_COMPRESSION_RATIO) {
      return { ok: false, code: 'DOCX_COMPRESSION_RATIO_EXCEEDED' };
    }

    if (localHeaderOffset + 30 > centralDirectoryOffset || readU32(content, localHeaderOffset) !== ZIP_LOCAL_SIGNATURE) {
      return malformed();
    }
    const localFlags = readU16(content, localHeaderOffset + 6);
    const localCompressionMethod = readU16(content, localHeaderOffset + 8);
    const localFilenameLength = readU16(content, localHeaderOffset + 26);
    const localExtraLength = readU16(content, localHeaderOffset + 28);
    if (localFlags !== flags || localCompressionMethod !== compressionMethod) return malformed();
    const dataStart = localHeaderOffset + 30 + localFilenameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (localFilenameLength > MAX_ZIP_NAME_BYTES || localExtraLength > MAX_ZIP_EXTRA_BYTES || dataEnd > centralDirectoryOffset) {
      return malformed();
    }
    if (compressedSize > 0) dataRanges.push({ start: dataStart, end: dataEnd });
    offset = entryEnd;
  }

  if (offset !== centralDirectoryEnd) return malformed();
  dataRanges.sort((left, right) => left.start - right.start);
  for (let index = 1; index < dataRanges.length; index += 1) {
    if (dataRanges[index].start < dataRanges[index - 1].end) return malformed();
  }

  return { ok: true, entryCount, totalUncompressedBytes };
}

export function binaryOutputWithinLimits(plainText: string, blockCount: number): boolean {
  return Array.from(plainText).length <= SOURCE_IMPORT_MAX_BINARY_EXTRACTED_TEXT_CHARS
    && blockCount <= SOURCE_IMPORT_MAX_BINARY_EXTRACTED_BLOCKS;
}
