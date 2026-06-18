type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

function write(level: LogLevel, message: string, payload?: LogPayload) {
  const line = {
    ts: new Date().toISOString(),
    level,
    message,
    ...payload,
  };

  const serialized = JSON.stringify(line);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export function logApi(
  level: LogLevel,
  message: string,
  payload: {
    route: string;
    method?: string;
    requestId: string;
    status?: number;
    durationMs?: number;
    ip?: string;
    detail?: string;
  } & LogPayload
) {
  write(level, message, payload);
}
