export const pgCode = (err: unknown): string | undefined =>
  typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : undefined;
