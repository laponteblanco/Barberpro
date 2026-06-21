export async function withTimeout<T>(
  promise: PromiseLike<T>, 
  timeoutMs: number, 
  operationName: string
): Promise<T> {
  console.time(`⏱️ ${operationName}`);
  
  let timeoutHandle: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      console.timeEnd(`⏱️ ${operationName}`);
      reject(new Error(`[TIMEOUT] La operacion '${operationName}' supero los ${timeoutMs}ms y fue abortada.`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    console.timeEnd(`⏱️ ${operationName}`);
    return result;
  } finally {
    clearTimeout(timeoutHandle!);
  }
}
