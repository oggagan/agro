/**
 * Standard where clause to filter out soft-deleted records.
 */
export const notDeleted = { deletedAt: null } as const;

/**
 * Build soft-delete data object for marking a record as deleted.
 */
export function softDeleteData(deletedBy: string) {
  return {
    deletedAt: new Date(),
    deletedBy,
  };
}
