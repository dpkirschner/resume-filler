/**
 * Vendor Adapters Index
 * Exports all available vendor adapters for the mapping engine
 */

export { BaseAdapter } from './base-adapter';
export { GreenhouseAdapter } from './greenhouse/greenhouse-adapter';
export { WorkdayAdapter } from './workday/workday-adapter';

import { VendorAdapter } from '../types';
import { GreenhouseAdapter } from './greenhouse/greenhouse-adapter';
import { WorkdayAdapter } from './workday/workday-adapter';

/**
 * Registry of all available vendor adapters
 * Sorted by priority (higher priority adapters are tried first)
 */
export const VENDOR_ADAPTERS: VendorAdapter[] = [
  new GreenhouseAdapter(),
  new WorkdayAdapter(),
  // Add new adapters here (Lever, BambooHR, etc.)
].sort((a, b) => b.priority - a.priority);

/**
 * Gets the appropriate vendor adapter for a given URL
 * Returns null if no adapter can handle the URL
 */
export function getVendorAdapter(url: string): VendorAdapter | null {
  return VENDOR_ADAPTERS.find(adapter => adapter.canHandle(url)) || null;
}

/**
 * Gets all vendor adapters that can handle a given URL
 * Useful for testing or when multiple adapters might apply
 */
export function getAllCompatibleAdapters(url: string): VendorAdapter[] {
  return VENDOR_ADAPTERS.filter(adapter => adapter.canHandle(url));
}