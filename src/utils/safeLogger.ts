/**
 * Safe Logger Utility
 *
 * Provides utility functions for logging large data structures without causing
 * extremely long log strings or circular reference issues.
 */

const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 10;

/**
 * Safely truncate a string to a maximum length
 */
export function truncateString(str: string | undefined | null, maxLength: number = MAX_STRING_LENGTH): string {
  if (str === undefined || str === null) {
    return 'undefined';
  }
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + `... (truncated, total: ${str.length} chars)`;
}

/**
 * Safely log an array by limiting the number of items shown
 */
export function truncateArray<T>(arr: T[] | undefined | null, maxLength: number = MAX_ARRAY_LENGTH): string {
  if (arr === undefined || arr === null) {
    return 'undefined';
  }
  if (arr.length <= maxLength) {
    return JSON.stringify(arr);
  }
  const truncated = arr.slice(0, maxLength);
  return JSON.stringify(truncated) + `... (truncated, total: ${arr.length} items)`;
}

/**
 * Safely log an object by limiting depth and handling circular references
 */
export function safeStringify(obj: unknown): string {
  const seen = new WeakSet();

  const replacer = (_key: string, value: unknown): unknown => {
    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }

    // Handle special cases
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: truncateString(value.stack, 500)
      };
    }

    // Handle large strings
    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      return truncateString(value, MAX_STRING_LENGTH);
    }

    // Handle large arrays
    if (Array.isArray(value) && value.length > MAX_ARRAY_LENGTH) {
      return truncateArray(value, MAX_ARRAY_LENGTH);
    }

    return value;
  };

  try {
    const result = JSON.stringify(obj, replacer, 2);
    // Check if result is too long and truncate if needed
    if (result && result.length > 2000) {
      return result.substring(0, 2000) + '... (truncated)';
    }
    return result || 'undefined';
  } catch (error) {
    return `[Unstringifiable: ${error instanceof Error ? error.message : String(error)}]`;
  }
}

/**
 * Log a message with safe data handling
 */
export function safeLog(prefix: string, data: unknown): void {
  console.log(prefix, safeStringify(data));
}

/**
 * Log an error with safe data handling
 */
export function safeError(prefix: string, data: unknown): void {
  console.error(prefix, safeStringify(data));
}

/**
 * Log a warning with safe data handling
 */
export function safeWarn(prefix: string, data: unknown): void {
  console.warn(prefix, safeStringify(data));
}
