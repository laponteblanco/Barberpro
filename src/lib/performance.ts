let _counter = 0;

export async function withTimeout<T>(
  promise: PromiseLike<T>, 
  timeoutMs: number, 
  operationName: string
): Promise<T> {
  const uniqueLabel = `⏱️ ${operationName} - ${++_counter}`;
  console.time(uniqueLabel);
  
  let timeoutHandle: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      console.timeEnd(uniqueLabel);
      reject(new Error(`[TIMEOUT] La operacion '${operationName}' supero los ${timeoutMs}ms y fue abortada.`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    console.timeEnd(uniqueLabel);
    return result;
  } finally {
    clearTimeout(timeoutHandle!);
  }
}
