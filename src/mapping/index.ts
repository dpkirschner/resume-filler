/**
 * Mapping Module Index
 * Exports all heuristic mapping components
 */

export { HeuristicScorer, DEFAULT_WEIGHTS } from './heuristic-scorer';
export { ProfileMatcher } from './profile-matcher';
export { 
  HeuristicMapper, 
  DEFAULT_HEURISTIC_CONFIG,
  type HeuristicMapperConfig 
} from './heuristic-mapper';

// Re-export utility functions for convenience
export {
  extractProfileSchema,
  getProfileKeys,
  isProfileKeySensitive,
  getProfileKeyType,
  validateProfileKeys,
  findCanonicalProfileKey,
  PROFILE_SYNONYMS
} from '../utils/profile-schema';