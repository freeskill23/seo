import type { ProductDataProvider } from '../types';
import { ManualProvider } from './manual-provider';

const providerRegistry: Record<string, () => ProductDataProvider> = {
  manual: () => new ManualProvider(),
};

export function getProvider(name: string = 'manual'): ProductDataProvider {
  const factory = providerRegistry[name] || providerRegistry.manual;
  return factory();
}

export function registerProvider(name: string, factory: () => ProductDataProvider) {
  providerRegistry[name] = factory;
}

export { ManualProvider } from './manual-provider';
export { CsvProvider } from './csv-provider';
export { ExternalApiProvider } from './external-api-provider';
