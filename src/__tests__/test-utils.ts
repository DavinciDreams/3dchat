/**
 * Common Test Utilities
 *
 * Provides reusable test helpers and utilities
 */

import { vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { beforeEach, afterEach, expect } from 'vitest';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

/**
 * Reset all mocks before each test
 */
export function resetAllMocks(): void {
  vi.clearAllMocks();
}

/**
 * Wait for a specific timeout
 */
export async function waitForTimeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock function that can be awaited
 */
export function createAsyncMock<T extends (...args: unknown[]) => unknown>(
  implementation: (...args: T[]) => unknown
): () => Promise<T> {
  return (...args: T[]) => Promise.resolve(implementation(...args));
}

/**
 * Create a mock function that rejects
 */
export function createRejectingMock<T extends (...args: unknown[]) => unknown>(
  error: Error | string
): () => Promise<T> {
  return (...args: T[]) => Promise.reject(new Error(error));
}

/**
 * Get all mock calls made to a specific mock
 */
export function getMockCalls(mock: ReturnType<typeof vi.fn>): Array<{
  args: unknown[];
  result: unknown;
}> {
  return mock.mock.calls.map((call) => ({
    args: call,
    result: call.result as unknown,
  }));
}

/**
 * Get the last call made to a specific mock
 */
export function getLastMockCall(mock: ReturnType<typeof vi.fn>): {
  args: unknown[];
  result: unknown;
} | null {
  const calls = getMockCalls(mock);
  return calls.length > 0 ? calls[calls.length - 1] : null;
}

/**
 * Clear all mock calls
 */
export function clearMockCalls(mock: ReturnType<typeof vi.fn>): void {
  mock.mockClear();
}

/**
 * Reset mock to return a specific value
 */
export function mockReturnValue<T>(
  mock: ReturnType<typeof vi.fn>,
  value: T
): void {
  mock.mockReturnValue(value);
}

/**
 * Reset mock to return values in sequence
 */
export function mockReturnValues<T>(
  mock: ReturnType<typeof vi.fn>,
  values: T[]
): void {
  mock.mockReturnValueOnce(values[0]);
  for (let i = 1; i < values.length; i++) {
    mock.mockReturnValueOnce(values[i]);
  }
}

/**
 * Clean up after each test
 */
afterEach(() => {
  cleanup();
});
