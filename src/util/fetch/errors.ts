/**
 * Error with additional system information (e.g. Node.js system errors).
 */
export interface SystemError extends Error {
  code?: string;
  cause?: unknown;
}

/**
 * Detect transient connection errors distinct from rate limits or permanent
 * certificate/config errors.  Only matches errors that are likely to succeed
 * on retry (stale connections, mid-stream resets).  Permanent failures like
 * "self signed certificate", "unable to verify", "unknown ca", or
 * "wrong version number" (HTTPS->HTTP mismatch) are intentionally excluded.
 */
export function isTransientConnectionError(error: Error | undefined): boolean {
  if (!error) {
    return false;
  }

  // Check error.code first — more robust across Node.js versions than
  // parsing error messages, since system errors always set .code.
  const code = (error as SystemError).code;
  if (code === 'ECONNRESET' || code === 'EPIPE') {
    return true;
  }

  const message = (error.message ?? '').toLowerCase();
  // EPROTO can wrap permanent TLS misconfigs. Exclude when paired with
  // known permanent error phrases to avoid futile retries.
  if (
    message.includes('eproto') &&
    (message.includes('wrong version number') ||
      message.includes('self signed') ||
      message.includes('unable to verify') ||
      message.includes('unknown ca') ||
      message.includes('cert'))
  ) {
    return false;
  }
  return (
    message.includes('bad record mac') ||
    message.includes('eproto') ||
    message.includes('econnreset') ||
    message.includes('socket hang up')
  );
}

/**
 * Detect connection-refused or host-unreachable errors (e.g. local server not running).
 * Used to show a friendlier message when apiBaseUrl points at localhost.
 */
export function isConnectionRefusedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = (error as SystemError).code ?? (error as { cause?: SystemError }).cause?.code;
  const message = String((error as Error).message ?? '').toLowerCase();
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  );
}

/**
 * Returns a user-friendly connection error message when the error is connection-refused
 * or host-unreachable. ECONNREFUSED gets "Is the server running?"; ENOTFOUND gets
 * "Check the URL and that the host is reachable." Returns null otherwise.
 * The URL is intentionally omitted from the message to avoid leaking credentials.
 */
export function formatConnectionErrorMessage(error: unknown): string | null {
  if (!isConnectionRefusedError(error)) {
    return null;
  }
  const code = (error as SystemError).code ?? (error as { cause?: SystemError }).cause?.code;
  const message = String((error as Error).message ?? '').toLowerCase();
  const isRefused = code === 'ECONNREFUSED' || message.includes('econnrefused');
  if (isRefused) {
    return `Could not reach the server. Is it running? (${String(error)})`;
  }
  return `Could not reach the server. Check the URL and that the host is reachable. (${String(error)})`;
}
