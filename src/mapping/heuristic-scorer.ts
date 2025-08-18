/**
 * Heuristic Scoring Engine
 * Calculates similarity scores between form fields and profile keys
 * using multiple scoring strategies with configurable weights
 */

import { 
  FormFieldSchema, 
  HeuristicWeights, 
  ScoreBreakdown 
} from '../types';
import { PROFILE_SYNONYMS } from '../utils/profile-schema';

/**
 * Default scoring weights optimized for job application forms
 */
export const DEFAULT_WEIGHTS: HeuristicWeights = {
  exactMatch: 1.0,        // Perfect label match
  partialMatch: 0.6,      // Substring match
  autocompleteMatch: 0.9, // HTML autocomplete attribute match
  nameAttributeMatch: 0.8, // Name attribute match
  idAttributeMatch: 0.7,   // ID attribute match  
  typeBonus: 0.2,         // Input type alignment bonus
  synonymBonus: 0.8       // Known synonym match
};

/**
 * Autocomplete attribute mappings to profile keys
 * Based on HTML5 autocomplete specification
 */
const AUTOCOMPLETE_MAPPINGS: Record<string, string[]> = {
  'given-name': ['First Name'],
  'family-name': ['Last Name'], 
  'name': ['First Name', 'Last Name'], // Could match either
  'email': ['Email'],
  'tel': ['Phone'],
  'street-address': ['Address'],
  'address-line1': ['Address'],
  'locality': ['City'],
  'region': ['State'],
  'country': ['Country'],
  'postal-code': ['Zip Code'],
  'organization': ['Current Company'],
  'organization-title': ['Current Job Title'],
  'url': ['Website', 'LinkedIn', 'Portfolio']
};

/**
 * Input type mappings for type bonus scoring
 */
const TYPE_MAPPINGS: Record<string, string[]> = {
  'email': ['Email'],
  'tel': ['Phone'],
  'url': ['Website', 'LinkedIn', 'Portfolio'],
  'file': ['Resume'],
  'date': ['Available Start Date', 'Birth Date']
};

export class HeuristicScorer {
  constructor(private weights: HeuristicWeights = DEFAULT_WEIGHTS) {}

  /**
   * Calculates overall similarity score between a form field and profile key
   */
  calculateFieldScore(field: FormFieldSchema, profileKey: string): ScoreBreakdown {
    const breakdown: ScoreBreakdown = {
      exactMatch: this.calculateExactMatch(field.label, profileKey),
      partialMatch: this.calculatePartialMatch(field.label, profileKey),
      autocompleteMatch: this.calculateAutocompleteMatch(field.attributes.autocomplete, profileKey),
      nameAttributeMatch: this.calculateNameMatch(field.attributes.name, profileKey),
      idAttributeMatch: this.calculateIdMatch(field.attributes.id, profileKey),
      typeBonus: this.calculateTypeBonus(field.attributes.type, profileKey),
      synonymBonus: this.calculateSynonymMatch(field.label, profileKey),
      totalScore: 0
    };

    // Calculate weighted total score
    breakdown.totalScore = 
      breakdown.exactMatch * this.weights.exactMatch +
      breakdown.partialMatch * this.weights.partialMatch +
      breakdown.autocompleteMatch * this.weights.autocompleteMatch +
      breakdown.nameAttributeMatch * this.weights.nameAttributeMatch +
      breakdown.idAttributeMatch * this.weights.idAttributeMatch +
      breakdown.typeBonus * this.weights.typeBonus +
      breakdown.synonymBonus * this.weights.synonymBonus;

    // Normalize to 0-1 range (max possible score is sum of all weights)
    const maxPossibleScore = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
    breakdown.totalScore = Math.min(1, breakdown.totalScore / maxPossibleScore);

    return breakdown;
  }

  /**
   * Checks for exact label match (case-insensitive)
   */
  private calculateExactMatch(fieldLabel: string, profileKey: string): number {
    const normalizedLabel = this.normalizeText(fieldLabel);
    const normalizedKey = this.normalizeText(profileKey);
    return normalizedLabel === normalizedKey ? 1 : 0;
  }

  /**
   * Calculates partial match score using edit distance and substring matching
   */
  private calculatePartialMatch(fieldLabel: string, profileKey: string): number {
    const normalizedLabel = this.normalizeText(fieldLabel);
    const normalizedKey = this.normalizeText(profileKey);

    // Skip if exact match (already scored)
    if (normalizedLabel === normalizedKey) return 0;

    // Substring matching
    if (normalizedLabel.includes(normalizedKey) || normalizedKey.includes(normalizedLabel)) {
      return 0.8;
    }

    // Word-based matching (split on spaces)
    const labelWords = normalizedLabel.split(/\s+/);
    const keyWords = normalizedKey.split(/\s+/);
    
    const commonWords = labelWords.filter(word => 
      keyWords.some(keyWord => word.includes(keyWord) || keyWord.includes(word))
    );
    
    if (commonWords.length > 0) {
      return Math.min(0.7, commonWords.length / Math.max(labelWords.length, keyWords.length));
    }

    // Edit distance for similar strings
    const editDistance = this.calculateEditDistance(normalizedLabel, normalizedKey);
    const maxLength = Math.max(normalizedLabel.length, normalizedKey.length);
    
    if (maxLength > 0 && editDistance / maxLength < 0.5) {
      return Math.max(0, 1 - (editDistance / maxLength));
    }

    return 0;
  }

  /**
   * Scores autocomplete attribute matches
   */
  private calculateAutocompleteMatch(autocomplete: string | undefined, profileKey: string): number {
    if (!autocomplete) return 0;

    const normalizedAutocomplete = autocomplete.toLowerCase().trim();
    
    for (const [autoValue, mappedKeys] of Object.entries(AUTOCOMPLETE_MAPPINGS)) {
      if (normalizedAutocomplete === autoValue || normalizedAutocomplete.includes(autoValue)) {
        if (mappedKeys.includes(profileKey)) {
          return 1;
        }
      }
    }

    return 0;
  }

  /**
   * Scores name attribute matches
   */
  private calculateNameMatch(name: string | undefined, profileKey: string): number {
    if (!name) return 0;

    const normalizedName = this.normalizeText(name);
    const normalizedKey = this.normalizeText(profileKey);

    // Exact match
    if (normalizedName === normalizedKey) return 1;

    // Common patterns in name attributes
    const namePatterns: Record<string, string[]> = {
      'firstname': ['First Name'],
      'lastname': ['Last Name'],
      'email': ['Email'],
      'phone': ['Phone'],
      'address': ['Address'],
      'city': ['City'],
      'state': ['State'],
      'country': ['Country'],
      'zip': ['Zip Code'],
      'zipcode': ['Zip Code']
    };

    for (const [pattern, keys] of Object.entries(namePatterns)) {
      if (normalizedName.includes(pattern) && keys.includes(profileKey)) {
        return 0.9;
      }
    }

    // Partial matching for name attributes
    if (normalizedName.includes(normalizedKey.replace(/\s+/g, '')) ||
        normalizedKey.replace(/\s+/g, '').includes(normalizedName)) {
      return 0.7;
    }

    return 0;
  }

  /**
   * Scores ID attribute matches
   */
  private calculateIdMatch(id: string | undefined, profileKey: string): number {
    if (!id) return 0;

    // Similar logic to name matching but with slightly lower confidence
    const score = this.calculateNameMatch(id, profileKey);
    return score * 0.9; // Reduce confidence slightly for ID matches
  }

  /**
   * Calculates bonus for input type alignment
   */
  private calculateTypeBonus(type: string | undefined, profileKey: string): number {
    if (!type) return 0;

    const normalizedType = type.toLowerCase();
    
    for (const [inputType, mappedKeys] of Object.entries(TYPE_MAPPINGS)) {
      if (normalizedType === inputType && mappedKeys.includes(profileKey)) {
        return 1;
      }
    }

    return 0;
  }

  /**
   * Calculates synonym match score
   */
  private calculateSynonymMatch(fieldLabel: string, profileKey: string): number {
    const normalizedLabel = this.normalizeText(fieldLabel);
    
    // Check if profileKey has known synonyms
    const synonyms = PROFILE_SYNONYMS[profileKey];
    if (!synonyms) return 0;

    for (const synonym of synonyms) {
      const normalizedSynonym = this.normalizeText(synonym);
      if (normalizedLabel === normalizedSynonym) {
        return 1;
      }
      
      // Partial synonym matching
      if (normalizedLabel.includes(normalizedSynonym) || 
          normalizedSynonym.includes(normalizedLabel)) {
        return 0.8;
      }
    }

    return 0;
  }

  /**
   * Normalizes text for comparison (lowercase, trim, remove special chars)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Calculates edit distance between two strings using dynamic programming
   */
  private calculateEditDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Updates scoring weights
   */
  updateWeights(newWeights: Partial<HeuristicWeights>): void {
    this.weights = { ...this.weights, ...newWeights };
  }

  /**
   * Gets current scoring weights
   */
  getWeights(): HeuristicWeights {
    return { ...this.weights };
  }
}