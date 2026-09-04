import express, { type ErrorRequestHandler, type Request, type RequestHandler, type Response } from 'express';
import type { LearnerAuthResult } from './groundedChat';
import { SOURCE_IMPORT_MAX_BASE64_CHARS } from './importTransport.server';
import { SOURCE_VERSION_MAX_TEXT_CODE_POINTS } from './versioning';
import {
  authRequiredResult,
  extractBearerToken,
  featureDisabledResult,
  invalidRequestResult,
  unavailableResult,
  verifyOrReject,
  type SourcesTransportResult,
  type VerifiedLearner,
} from './transportShared.server';

export const SOURCE_IMPORT_ROUTE_PATH = '/api/sources/import';
export const SOURCE_VERSION_EDIT_ROUTE_PATH = '/api/sources/versions';
export const SOURCE_IMPORT_JSON_BODY_OVERHEAD_BYTES = 16 * 1024;
export const SOURCE_IMPORT_MAX_JSON_BODY_BYTES = SOURCE_IMPORT_MAX_BASE64_CHARS + SOURCE_IMPORT_JSON_BODY_OVERHEAD_BYTES;
// A JSON string may represent one Unicode code point as an escaped UTF-16
// surrogate pair (12 ASCII bytes). The fixed metadata allowance covers the two
// UUID fields, property names, JSON punctuation, and bounded future metadata.
export const SOURCE_VERSION_EDIT_JSON_BYTES_PER_CODE_POINT = 12;
export const SOURCE_VERSION_EDIT_JSON_BODY_OVERHEAD_BYTES = 16 * 1024;
export const SOURCE_VERSION_EDIT_MAX_JSON_BODY_BYTES =
  SOURCE_VERSION_MAX_TEXT_CODE_POINTS * SOURCE_VERSION_EDIT_JSON_BYTES_PER_CODE_POINT
  + SOURCE_VERSION_EDIT_JSON_BODY_OVERHEAD_BYTES;

export type SourceImportAdmissionOptions = {
  featureEnabled: boolean;
  cloudConfigured: boolean;
  verifyAccessToken?: (accessToken: string) => Promise<LearnerAuthResult>;
};

function sendResult(res: Response, result: SourcesTransportResult): void {
  if (result.headers) {
    for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
  }
  res.status(result.status).json(result.body);
}

function contentTypeIsJson(request: Request): boolean {
  const contentType = request.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  return contentType === 'application/json';
}

function declaredLengthIsWithin(request: Request, maxBytes: number): boolean {
  const raw = request.get('content-length');
  if (raw === undefined) return true;
  if (!/^\d+$/.test(raw.trim())) return false;
  const length = Number(raw);
  return Number.isSafeInteger(length) && length <= maxBytes;
}

export function isSourceImportRoute(request: Request): boolean {
  try {
    return decodeURIComponent(request.path).replace(/\/+$/, '') === SOURCE_IMPORT_ROUTE_PATH;
  } catch {
    return false;
  }
}

export function isSourceVersionEditRoute(request: Request): boolean {
  try {
    return decodeURIComponent(request.path).replace(/\/+$/, '') === SOURCE_VERSION_EDIT_ROUTE_PATH;
  } catch {
    return false;
  }
}

function isSourcesAdmissionRoute(request: Request): boolean {
  return isSourceImportRoute(request) || isSourceVersionEditRoute(request);
}

/**
 * Keeps the generic application parser away from source-import requests.
 * The route installs its own parser after this admission gate.
 */
export function createJsonParserExcludingSourceImport(genericParser: RequestHandler): RequestHandler {
  return (request, response, next) => {
    if (isSourcesAdmissionRoute(request)) return next();
    return genericParser(request, response, next);
  };
}

function createSourceAdmissionGate(options: SourceImportAdmissionOptions & { maxJsonBodyBytes: number }): RequestHandler {
  return async (request, response, next) => {
    if (options.featureEnabled !== true) {
      sendResult(response, featureDisabledResult());
      return;
    }

    const accessToken = extractBearerToken(request.get('authorization'));
    if (!accessToken) {
      sendResult(response, authRequiredResult());
      return;
    }
    if (!options.cloudConfigured) {
      sendResult(response, unavailableResult());
      return;
    }

    const auth = await verifyOrReject(accessToken, options.verifyAccessToken);
    if (!('ok' in auth)) {
      sendResult(response, auth);
      return;
    }

    // These checks are cheap and happen while the body is still unread.
    if (!contentTypeIsJson(request) || !declaredLengthIsWithin(request, options.maxJsonBodyBytes)) {
      sendResult(response, invalidRequestResult());
      return;
    }

    response.locals.sourcesVerifiedLearner = auth.learner satisfies VerifiedLearner;
    next();
  };
}

export function createSourceImportAdmissionGate(options: SourceImportAdmissionOptions): RequestHandler {
  return createSourceAdmissionGate({ ...options, maxJsonBodyBytes: SOURCE_IMPORT_MAX_JSON_BODY_BYTES });
}

export function createSourceVersionEditAdmissionGate(options: SourceImportAdmissionOptions): RequestHandler {
  return createSourceAdmissionGate({ ...options, maxJsonBodyBytes: SOURCE_VERSION_EDIT_MAX_JSON_BODY_BYTES });
}

export function createSourceImportJsonParser(): RequestHandler {
  return express.json({
    limit: SOURCE_IMPORT_MAX_JSON_BODY_BYTES,
    strict: true,
    type: 'application/json',
  });
}

export function createSourceVersionEditJsonParser(): RequestHandler {
  return express.json({
    limit: SOURCE_VERSION_EDIT_MAX_JSON_BODY_BYTES,
    strict: true,
    type: 'application/json',
  });
}

/** Convert parser failures into the same safe body as other malformed imports. */
export function createSourceImportParserErrorHandler(): ErrorRequestHandler {
  return (error: unknown, _request: Request, response: Response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }
    sendResult(response, invalidRequestResult());
  };
}
