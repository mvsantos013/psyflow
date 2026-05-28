export type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  stepLabel?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "erro inesperado";
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const attempts = options?.attempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 300;
  const stepLabel = options?.stepLabel ?? "operação";

  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await sleep(baseDelayMs * 3 ** i);
      }
    }
  }

  throw new Error(`${stepLabel}: ${toErrorMessage(lastError)}`);
}
