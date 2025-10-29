export const ERROR_MESSAGES = {
  FETCH_FAILED: (entity: string) => `Failed to fetch ${entity}`,
  CREATE_FAILED: (entity: string) => `Failed to create ${entity}`,
  UPDATE_FAILED: (entity: string) => `Failed to update ${entity}`,
  DELETE_FAILED: (entity: string) => `Failed to delete ${entity}`,
  NOT_FOUND: (entity: string) => `${entity} not found`,
} as const;
