import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/api-response.js';
import { getUserAgent, getClientIp, getParam } from '../../utils/request.js';
import * as distributorService from './distributor.service.js';

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

/** Map distributor response: add canLogin and displayName/displayPhone/displayEmail from User + Phone/Email. */
function mapDistributorResponse(r: any) {
  if (!r) return r;
  const directors = (r.directors ?? []).map((d: any) => ({
    ...d,
    displayName: d.user?.name ?? null,
    displayPhone: primaryPhone(d.user?.phones) ?? null,
    displayEmail: primaryEmail(d.user?.emails) ?? null,
  }));
  const authorizedPersons = (r.authorizedPersons ?? []).map((ap: any) => ({
    ...ap,
    canLogin: !!ap.userId,
    displayName: ap.user?.name ?? null,
    displayPhone: primaryPhone(ap.user?.phones) ?? null,
    displayEmail: primaryEmail(ap.user?.emails) ?? null,
  }));
  const user = r.user;
  const mappedUser = user
    ? {
        ...user,
        phone: primaryPhone(user.phones),
        email: primaryEmail(user.emails),
      }
    : user;
  return { ...r, user: mappedUser, directors, authorizedPersons };
}

export async function createDistributor(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.createDistributor(
      req.body,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({
      res,
      data: mapDistributorResponse(result),
      message: 'Distributor created.',
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

export async function listDistributors(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.listDistributors(req.query as Record<string, unknown>);
    const data = (result.data as any[]).map(mapDistributorResponse);
    sendSuccess({ res, data, message: 'Distributors retrieved.', meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function getDistributorById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.getDistributorById(getParam(req, 'id'));
    sendSuccess({ res, data: mapDistributorResponse(result), message: 'Distributor retrieved.' });
  } catch (error) {
    next(error);
  }
}

export async function updateDistributor(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.updateDistributor(
      getParam(req, 'id'),
      req.body,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: mapDistributorResponse(result), message: 'Distributor updated.' });
  } catch (error) {
    next(error);
  }
}

export async function updateDistributorStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.updateDistributorStatus(
      getParam(req, 'id'),
      req.body.status,
      req.body.reason,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: mapDistributorResponse(result), message: 'Distributor status updated.' });
  } catch (error) {
    next(error);
  }
}

export async function uploadDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    const result = await distributorService.uploadDocuments(
      getParam(req, 'id'),
      files,
      req.body.docType,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Documents uploaded.', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.deleteDocument(
      getParam(req, 'id'),
      getParam(req, 'docId'),
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Document deleted.' });
  } catch (error) {
    next(error);
  }
}

export async function addDirector(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.addDirector(
      getParam(req, 'id'),
      req.body,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Director added.', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function updateDirector(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.updateDirector(
      getParam(req, 'id'),
      getParam(req, 'dirId'),
      req.body,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Director updated.' });
  } catch (error) {
    next(error);
  }
}

export async function deleteDirector(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.deleteDirector(
      getParam(req, 'id'),
      getParam(req, 'dirId'),
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Director deleted.' });
  } catch (error) {
    next(error);
  }
}

export async function uploadDirectorDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    const result = await distributorService.uploadDirectorDocuments(
      getParam(req, 'id'),
      getParam(req, 'dirId'),
      files,
      req.body.docType,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Director documents uploaded.', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function addAuthorizedPerson(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.addAuthorizedPerson(
      getParam(req, 'id'),
      req.body,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Authorized person added.', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function updateAuthorizedPerson(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.updateAuthorizedPerson(
      getParam(req, 'id'),
      getParam(req, 'apId'),
      req.body,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Authorized person updated.' });
  } catch (error) {
    next(error);
  }
}

export async function removeAuthorizedPerson(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.removeAuthorizedPerson(
      getParam(req, 'id'),
      getParam(req, 'apId'),
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Authorized person removed.' });
  } catch (error) {
    next(error);
  }
}

export async function uploadAuthorizedPersonDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    const result = await distributorService.uploadAuthorizedPersonDocuments(
      getParam(req, 'id'),
      getParam(req, 'apId'),
      files,
      req.body.docType,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Authorized person documents uploaded.', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function upsertBankDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.upsertBankDetails(
      getParam(req, 'id'),
      req.body,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Bank details updated.' });
  } catch (error) {
    next(error);
  }
}

export async function uploadBankDetailsDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    const result = await distributorService.uploadBankDetailsDocuments(
      getParam(req, 'id'),
      files,
      req.body.docType,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Bank details documents uploaded.', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function addLicense(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.addLicense(
      getParam(req, 'id'),
      req.body,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'License added.', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function updateLicense(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.updateLicense(
      getParam(req, 'id'),
      getParam(req, 'licId'),
      req.body,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'License updated.' });
  } catch (error) {
    next(error);
  }
}

export async function deleteLicense(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributorService.deleteLicense(
      getParam(req, 'id'),
      getParam(req, 'licId'),
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'License deleted.' });
  } catch (error) {
    next(error);
  }
}

export async function uploadLicenseDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    const result = await distributorService.uploadLicenseDocuments(
      getParam(req, 'id'),
      getParam(req, 'licId'),
      files,
      req.body.docType,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'License documents uploaded.', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}
