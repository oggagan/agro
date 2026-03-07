import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/api-response.js';
import { getUserAgent, getClientIp, getParam } from '../../utils/request.js';
import * as mfgService from './manufacturer.service.js';

function primaryPhone(phones: { number: string; isPrimary?: boolean }[] | undefined): string | null {
  if (!phones?.length) return null;
  const p = phones.find((x) => x.isPrimary) ?? phones[0];
  return p?.number ?? null;
}
function primaryEmail(emails: { address: string; isPrimary?: boolean }[] | undefined): string | null {
  if (!emails?.length) return null;
  const e = emails.find((x) => x.isPrimary) ?? emails[0];
  return e?.address ?? null;
}

/** Map manufacturer response: add canLogin and displayName/displayPhone/displayEmail from User + Phone/Email. */
function mapManufacturerResponse(m: any) {
  if (!m) return m;
  const directors = (m.directors ?? []).map((d: any) => ({
    ...d,
    displayName: d.user?.name ?? null,
    displayPhone: primaryPhone(d.user?.phones) ?? null,
    displayEmail: primaryEmail(d.user?.emails) ?? null,
  }));
  const authorizedPersons = (m.authorizedPersons ?? []).map((ap: any) => ({
    ...ap,
    canLogin: !!ap.userId,
    displayName: ap.user?.name ?? null,
    displayPhone: primaryPhone(ap.user?.phones) ?? null,
    displayEmail: primaryEmail(ap.user?.emails) ?? null,
  }));
  const user = m.user;
  const mappedUser = user
    ? {
        ...user,
        phone: primaryPhone(user.phones),
        email: primaryEmail(user.emails),
      }
    : user;
  return { ...m, user: mappedUser, directors, authorizedPersons };
}

// ─── Admin endpoints ─────────────────────────────────────────────────────────

export async function createManufacturer(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.createManufacturer(
      req.body, req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: mapManufacturerResponse(result), message: 'Manufacturer created.', statusCode: 201 });
  } catch (error) { next(error); }
}

export async function listManufacturers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.listManufacturers(req.query as Record<string, unknown>);
    const data = (result.data as any[]).map(mapManufacturerResponse);
    sendSuccess({ res, data, message: 'Manufacturers retrieved.', meta: result.meta });
  } catch (error) { next(error); }
}

export async function getManufacturerById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.getManufacturerById(getParam(req, 'id'));
    sendSuccess({ res, data: mapManufacturerResponse(result), message: 'Manufacturer retrieved.' });
  } catch (error) { next(error); }
}

export async function updateManufacturer(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.updateManufacturer(
      getParam(req, 'id'), req.body, req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: mapManufacturerResponse(result), message: 'Manufacturer updated.' });
  } catch (error) { next(error); }
}

export async function updateManufacturerStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.updateManufacturerStatus(
      getParam(req, 'id'), req.body.status, req.body.reason,
      req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: mapManufacturerResponse(result), message: 'Manufacturer status updated.' });
  } catch (error) { next(error); }
}

export async function uploadDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    const result = await mfgService.uploadDocuments(
      getParam(req, 'id'), files, req.body.docType,
      req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Documents uploaded.', statusCode: 201 });
  } catch (error) { next(error); }
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.deleteDocument(
      getParam(req, 'id'), getParam(req, 'docId'),
      req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Document deleted.' });
  } catch (error) { next(error); }
}

export async function uploadDirectorDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    const result = await mfgService.uploadDirectorDocuments(
      getParam(req, 'id'), getParam(req, 'dirId'), files, req.body.docType,
      req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Director documents uploaded.', statusCode: 201 });
  } catch (error) { next(error); }
}

export async function uploadAuthorizedPersonDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    const result = await mfgService.uploadAuthorizedPersonDocuments(
      getParam(req, 'id'), getParam(req, 'apId'), files, req.body.docType,
      req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Authorized person documents uploaded.', statusCode: 201 });
  } catch (error) { next(error); }
}

export async function uploadBankDetailsDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    const result = await mfgService.uploadBankDetailsDocuments(
      getParam(req, 'id'), files, req.body.docType,
      req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Bank details documents uploaded.', statusCode: 201 });
  } catch (error) { next(error); }
}

export async function addDirector(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.addDirector(
      getParam(req, 'id'), req.body, req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Director added.', statusCode: 201 });
  } catch (error) { next(error); }
}

export async function updateDirector(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.updateDirector(
      getParam(req, 'id'), getParam(req, 'dirId'), req.body,
      req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Director updated.' });
  } catch (error) { next(error); }
}

export async function deleteDirector(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.deleteDirector(
      getParam(req, 'id'), getParam(req, 'dirId'),
      req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Director deleted.' });
  } catch (error) { next(error); }
}

export async function addAuthorizedPerson(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.addAuthorizedPerson(
      getParam(req, 'id'), req.body, req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Authorized person added.', statusCode: 201 });
  } catch (error) { next(error); }
}

/** Legacy: PUT /:id/authorized-person (singular) – upserts when 0 or 1 authorized person. */
export async function upsertAuthorizedPersonLegacy(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.upsertAuthorizedPersonLegacy(
      getParam(req, 'id'), req.body, req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Authorized person updated.' });
  } catch (error) { next(error); }
}

export async function updateAuthorizedPerson(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.updateAuthorizedPerson(
      getParam(req, 'id'), getParam(req, 'apId'), req.body,
      req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Authorized person updated.' });
  } catch (error) { next(error); }
}

export async function removeAuthorizedPerson(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.removeAuthorizedPerson(
      getParam(req, 'id'), getParam(req, 'apId'),
      req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Authorized person removed.' });
  } catch (error) { next(error); }
}

export async function upsertBankDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.upsertBankDetails(
      getParam(req, 'id'), req.body, req.user!.userId, req.user!.role, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Bank details updated.' });
  } catch (error) { next(error); }
}

// ─── Self-service endpoints ──────────────────────────────────────────────────

export async function getOwnProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.getOwnManufacturerProfile(req.user!.userId);
    sendSuccess({ res, data: mapManufacturerResponse(result), message: 'Profile retrieved.' });
  } catch (error) { next(error); }
}

export async function updateOwnProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.updateOwnManufacturer(
      req.user!.userId, req.body, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: mapManufacturerResponse(result), message: 'Profile updated.' });
  } catch (error) { next(error); }
}

export async function uploadOwnDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    const result = await mfgService.uploadOwnDocuments(
      req.user!.userId, files, req.body.docType, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Documents uploaded.', statusCode: 201 });
  } catch (error) { next(error); }
}

export async function updateOwnBankDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.updateOwnBankDetails(
      req.user!.userId, req.body, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Bank details updated.' });
  } catch (error) { next(error); }
}

export async function updateOwnDirector(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.updateOwnDirector(
      req.user!.userId, getParam(req, 'dirId'), req.body, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Director updated.' });
  } catch (error) { next(error); }
}

export async function updateOwnAuthorizedPerson(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mfgService.updateOwnAuthorizedPerson(
      req.user!.userId, getParam(req, 'apId'), req.body, getClientIp(req), getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Authorized person updated.' });
  } catch (error) { next(error); }
}
