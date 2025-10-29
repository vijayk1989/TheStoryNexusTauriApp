export const formatError = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const isError = (e: unknown): e is Error => e instanceof Error;

export const getErrorMessage = (error: unknown): string =>
  isError(error) ? error.message : String(error);
