/**
 * Service lifetime options for dependency injection
 */
export enum ServiceLifetime {
  /** Single instance shared across the application */
  Singleton = 'singleton',
  /** New instance created each time it's resolved */
  Transient = 'transient',
  /** New instance per scope (not implemented yet) */
  Scoped = 'scoped',
}

/**
 * Service descriptor for registration
 */
export interface ServiceDescriptor<T = unknown> {
  /** Unique token identifying the service */
  token: string;
  /** Factory function to create the service instance */
  factory: () => T;
  /** Service lifetime */
  lifetime: ServiceLifetime;
  /** Optional list of dependency tokens */
  dependencies?: string[];
}

/**
 * Error thrown when a service is not registered
 */
export class ServiceNotFoundError extends Error {
  constructor(token: string) {
    super(`Service with token '${token}' not found in container`);
    this.name = 'ServiceNotFoundError';
  }
}

/**
 * Error thrown when a circular dependency is detected
 */
export class CircularDependencyError extends Error {
  constructor(token: string, chain: string[]) {
    super(
      `Circular dependency detected for '${token}': ${chain.join(' -> ')} -> ${token}`
    );
    this.name = 'CircularDependencyError';
  }
}

/**
 * Simple Dependency Injection Container
 *
 * Supports service registration, resolution, and lifecycle management.
 * Designed to be simple and extensible for future phases.
 */
export class ServiceContainer {
  private services = new Map<string, ServiceDescriptor>();
  private instances = new Map<string, unknown>();
  private resolving = new Set<string>();

  /**
   * Register a service with the container
   */
  register<T>(descriptor: ServiceDescriptor<T>): void {
    this.services.set(descriptor.token, descriptor);
  }

  /**
   * Register an existing instance as a singleton
   */
  registerInstance<T>(token: string, instance: T): void {
    this.instances.set(token, instance);
    this.services.set(token, {
      token,
      factory: () => instance,
      lifetime: ServiceLifetime.Singleton,
    });
  }

  /**
   * Resolve a service by token
   */
  resolve<T>(token: string): T {
    // Check for circular dependency
    if (this.resolving.has(token)) {
      throw new CircularDependencyError(token, Array.from(this.resolving));
    }

    // Check if instance already exists (for singletons)
    const existingInstance = this.instances.get(token);
    if (existingInstance !== undefined) {
      return existingInstance as T;
    }

    // Get service descriptor
    const descriptor = this.services.get(token);
    if (!descriptor) {
      throw new ServiceNotFoundError(token);
    }

    // For transient services, always create new instance
    if (descriptor.lifetime === ServiceLifetime.Transient) {
      return descriptor.factory() as T;
    }

    // For singletons, track resolution and create instance
    this.resolving.add(token);

    try {
      const instance = descriptor.factory();
      this.instances.set(token, instance);
      return instance as T;
    } finally {
      this.resolving.delete(token);
    }
  }

  /**
   * Check if a service is registered
   */
  has(token: string): boolean {
    return this.services.has(token);
  }

  /**
   * Clear all registered services and instances
   */
  clear(): void {
    this.services.clear();
    this.instances.clear();
    this.resolving.clear();
  }

  /**
   * Get all registered tokens
   */
  getTokens(): string[] {
    return Array.from(this.services.keys());
  }
}

// Global container instance
let globalContainer: ServiceContainer | null = null;

/**
 * Get or create the global container instance
 */
export function getContainer(): ServiceContainer {
  if (!globalContainer) {
    globalContainer = new ServiceContainer();
  }
  return globalContainer;
}

/**
 * Reset the global container (useful for testing)
 */
export function resetContainer(): void {
  globalContainer = null;
}
