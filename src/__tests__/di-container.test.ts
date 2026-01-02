/**
 * Test for DI Container
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceContainer, ServiceLifetime } from '../di/ServiceContainer';
import { SERVICE_TOKENS } from '../di/ServiceTokens';

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  it('should register and resolve a singleton service', () => {
    const service = { name: 'test' };
    container.register({
      token: SERVICE_TOKENS.LLM_CLIENT,
      factory: () => service,
      lifetime: ServiceLifetime.Singleton,
    });

    const resolved = container.resolve(SERVICE_TOKENS.LLM_CLIENT);
    expect(resolved).toBe(service);
  });

  it('should return same instance for singleton services', () => {
    const service = { name: 'test' };
    container.register({
      token: SERVICE_TOKENS.LLM_CLIENT,
      factory: () => service,
      lifetime: ServiceLifetime.Singleton,
    });

    const resolved1 = container.resolve(SERVICE_TOKENS.LLM_CLIENT);
    const resolved2 = container.resolve(SERVICE_TOKENS.LLM_CLIENT);
    expect(resolved1).toBe(resolved2);
  });

  it('should register and resolve a transient service', () => {
    const factory = () => ({ name: 'test' });
    container.register({
      token: SERVICE_TOKENS.LLM_CLIENT,
      factory,
      lifetime: ServiceLifetime.Transient,
    });

    const resolved1 = container.resolve(SERVICE_TOKENS.LLM_CLIENT);
    const resolved2 = container.resolve(SERVICE_TOKENS.LLM_CLIENT);
    expect(resolved1).not.toBe(resolved2);
  });

  it('should throw error when resolving unregistered service', () => {
    expect(() => {
      container.resolve(SERVICE_TOKENS.LLM_CLIENT);
    }).toThrow();
  });

  it('should check if service is registered', () => {
    const service = { name: 'test' };
    container.register({
      token: SERVICE_TOKENS.LLM_CLIENT,
      factory: () => service,
      lifetime: ServiceLifetime.Singleton,
    });

    expect(container.has(SERVICE_TOKENS.LLM_CLIENT)).toBe(true);
    expect(container.has(SERVICE_TOKENS.ANIMATION_JUDGE)).toBe(false);
  });

  it('should clear all registered services', () => {
    const service = { name: 'test' };
    container.register({
      token: SERVICE_TOKENS.LLM_CLIENT,
      factory: () => service,
      lifetime: ServiceLifetime.Singleton,
    });

    expect(container.has(SERVICE_TOKENS.LLM_CLIENT)).toBe(true);

    container.clear();

    expect(container.has(SERVICE_TOKENS.LLM_CLIENT)).toBe(false);
  });

  it('should get all registered tokens', () => {
    const service1 = { name: 'test1' };
    const service2 = { name: 'test2' };
    container.register({
      token: SERVICE_TOKENS.LLM_CLIENT,
      factory: () => service1,
      lifetime: ServiceLifetime.Singleton,
    });
    container.register({
      token: SERVICE_TOKENS.ANIMATION_JUDGE,
      factory: () => service2,
      lifetime: ServiceLifetime.Singleton,
    });

    const tokens = container.getTokens();
    expect(tokens).toContain(SERVICE_TOKENS.LLM_CLIENT);
    expect(tokens).toContain(SERVICE_TOKENS.ANIMATION_JUDGE);
  });
});
