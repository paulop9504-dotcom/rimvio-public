/** One ffmpeg pass at a time — concurrent runs corrupt output blobs. */
let compressChain: Promise<unknown> = Promise.resolve();

export function runShareVideoCompressSerial<T>(
  task: () => Promise<T>,
): Promise<T> {
  const run = compressChain.then(task, task);
  compressChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function resetShareVideoCompressSerialForTests(): void {
  compressChain = Promise.resolve();
}
