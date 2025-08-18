/**
 * Profile Key Matcher
 * Advanced matching logic for complex profile field scenarios
 * including work experience handling and compound field mapping
 */

import { 
  UserProfile, 
  FormFieldSchema, 
  FieldMapping,
  ScoreBreakdown,
  HeuristicWeights
} from '../types';
import { HeuristicScorer } from './heuristic-scorer';
import { getProfileKeys, isProfileKeySensitive } from '../utils/profile-schema';

interface MatchCandidate {
  profileKey: string;
  confidence: number;
  reasoning: string;
  isSensitive: boolean;
}

export class ProfileMatcher {
  private scorer: HeuristicScorer;

  constructor(scorer?: HeuristicScorer) {
    this.scorer = scorer || new HeuristicScorer();
  }

  /**
   * Finds the best profile key matches for a form field
   * Returns multiple candidates sorted by confidence
   */
  findMatches(
    field: FormFieldSchema,
    userProfile: UserProfile,
    options: {
      maxCandidates?: number;
      minConfidence?: number;
      includeSensitive?: boolean;
    } = {}
  ): MatchCandidate[] {
    const {
      maxCandidates = 3,
      minConfidence = 0.3,
      includeSensitive = false
    } = options;

    const profileKeys = getProfileKeys(userProfile);
    const candidates: MatchCandidate[] = [];

    // Score each profile key against the field
    for (const profileKey of profileKeys) {
      const isSensitive = isProfileKeySensitive(userProfile, profileKey);
      
      // Skip sensitive fields if not explicitly included
      if (isSensitive && !includeSensitive) {
        continue;
      }

      const scoreBreakdown = this.scorer.calculateFieldScore(field, profileKey);
      
      if (scoreBreakdown.totalScore >= minConfidence) {
        candidates.push({
          profileKey,
          confidence: scoreBreakdown.totalScore,
          reasoning: this.generateReasoning(scoreBreakdown, field.label, profileKey),
          isSensitive
        });
      }
    }

    // Sort by confidence (highest first) and limit results
    return candidates
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxCandidates);
  }

  /**
   * Finds the single best match for a form field
   */
  findBestMatch(
    field: FormFieldSchema,
    userProfile: UserProfile,
    options: {
      minConfidence?: number;
      includeSensitive?: boolean;
    } = {}
  ): MatchCandidate | null {
    const matches = this.findMatches(field, userProfile, { 
      ...options, 
      maxCandidates: 1 
    });
    
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Handles work experience field mapping
   * Maps form fields to specific work experience sub-fields
   */
  mapWorkExperienceFields(
    fields: FormFieldSchema[],
    userProfile: UserProfile,
    minConfidence: number = 0.5
  ): FieldMapping[] {
    const mappings: FieldMapping[] = [];
    const workExpField = userProfile.find(f => f.type === 'workExperience');
    
    if (!workExpField || !Array.isArray(workExpField.value)) {
      return mappings;
    }

    // Work experience sub-field patterns
    const workExpPatterns = [
      { patterns: ['job title', 'title', 'position'], key: 'title' },
      { patterns: ['company', 'employer', 'organization'], key: 'company' },
      { patterns: ['location', 'city', 'office'], key: 'location' },
      { patterns: ['start date', 'from', 'began'], key: 'startDate' },
      { patterns: ['end date', 'to', 'until', 'ended'], key: 'endDate' },
      { patterns: ['description', 'responsibilities', 'duties'], key: 'description' }
    ];

    for (let fieldIdx = 0; fieldIdx < fields.length; fieldIdx++) {
      const field = fields[fieldIdx];
      const normalizedLabel = field.label.toLowerCase();

      for (const pattern of workExpPatterns) {
        const matchScore = pattern.patterns.some(p => 
          normalizedLabel.includes(p)
        ) ? 0.8 : 0;

        if (matchScore >= minConfidence) {
          const profileKey = `${workExpField.label}.${pattern.key}`;
          
          mappings.push({
            formFieldIdx: fieldIdx,
            profileKey,
            confidence: matchScore,
            source: 'heuristic',
            action: this.determineAction(field),
            reasoning: `Work experience field detected: ${field.label} -> ${pattern.key}`
          });
          break; // Take first match to avoid duplicates
        }
      }
    }

    return mappings;
  }

  /**
   * Handles address field decomposition
   * Maps compound address fields to individual components
   */
  mapAddressFields(
    fields: FormFieldSchema[],
    userProfile: UserProfile,
    minConfidence: number = 0.6
  ): FieldMapping[] {
    const mappings: FieldMapping[] = [];
    const profileKeys = getProfileKeys(userProfile);

    const addressPatterns = [
      { patterns: ['street', 'address line 1', 'address1'], profileKey: 'Address' },
      { patterns: ['address line 2', 'address2', 'apt', 'suite'], profileKey: 'Address Line 2' },
      { patterns: ['city', 'town', 'locality'], profileKey: 'City' },
      { patterns: ['state', 'province', 'region'], profileKey: 'State' },
      { patterns: ['zip', 'postal', 'postcode'], profileKey: 'Zip Code' },
      { patterns: ['country', 'nation'], profileKey: 'Country' }
    ];

    for (let fieldIdx = 0; fieldIdx < fields.length; fieldIdx++) {
      const field = fields[fieldIdx];
      const normalizedLabel = field.label.toLowerCase();

      for (const pattern of addressPatterns) {
        if (!profileKeys.includes(pattern.profileKey)) continue;

        const matchScore = pattern.patterns.some(p => 
          normalizedLabel.includes(p)
        ) ? 0.8 : 0;

        if (matchScore >= minConfidence) {
          mappings.push({
            formFieldIdx: fieldIdx,
            profileKey: pattern.profileKey,
            confidence: matchScore,
            source: 'heuristic',
            action: this.determineAction(field),
            reasoning: `Address component detected: ${field.label} -> ${pattern.profileKey}`
          });
          break;
        }
      }
    }

    return mappings;
  }

  /**
   * Detects and handles repeatable form sections (like multiple work experiences)
   */
  detectRepeatableSections(fields: FormFieldSchema[]): {
    sections: FormFieldSchema[][];
    sectionType: 'workExperience' | 'education' | 'reference' | 'unknown';
  } {
    // Group fields by similar naming patterns that suggest repetition
    const sections: FormFieldSchema[][] = [];
    const usedFields = new Set<number>();

    // Look for numbered patterns (title-1, title-2, etc.)
    const numberedPatterns = new Map<string, FormFieldSchema[]>();
    
    for (let i = 0; i < fields.length; i++) {
      if (usedFields.has(i)) continue;
      
      const field = fields[i];
      const numberedMatch = field.attributes.name?.match(/^(.+?)[-_](\d+)$/);
      
      if (numberedMatch) {
        const [, baseName, number] = numberedMatch;
        const key = `${baseName}-${number}`;
        
        if (!numberedPatterns.has(key)) {
          numberedPatterns.set(key, []);
        }
        numberedPatterns.get(key)!.push(field);
        usedFields.add(i);
      }
    }

    // Group numbered patterns into sections
    const sectionGroups = new Map<string, FormFieldSchema[]>();
    for (const [key, fieldList] of numberedPatterns) {
      const sectionNumber = key.split('-').pop()!;
      if (!sectionGroups.has(sectionNumber)) {
        sectionGroups.set(sectionNumber, []);
      }
      sectionGroups.get(sectionNumber)!.push(...fieldList);
    }

    sections.push(...Array.from(sectionGroups.values()));

    // Determine section type based on field patterns
    let sectionType: 'workExperience' | 'education' | 'reference' | 'unknown' = 'unknown';
    
    if (sections.length > 0) {
      const sampleFields = sections[0];
      const labels = sampleFields.map(f => f.label.toLowerCase()).join(' ');
      
      if (labels.includes('job') || labels.includes('company') || labels.includes('title')) {
        sectionType = 'workExperience';
      } else if (labels.includes('school') || labels.includes('degree') || labels.includes('education')) {
        sectionType = 'education';
      } else if (labels.includes('reference') || labels.includes('contact')) {
        sectionType = 'reference';
      }
    }

    return { sections, sectionType };
  }

  /**
   * Generates human-readable reasoning for a mapping decision
   */
  private generateReasoning(scoreBreakdown: ScoreBreakdown, _fieldLabel: string, _profileKey: string): string {
    const reasons: string[] = [];
    
    if (scoreBreakdown.exactMatch > 0) {
      reasons.push('exact label match');
    }
    if (scoreBreakdown.synonymBonus > 0) {
      reasons.push('synonym match');
    }
    if (scoreBreakdown.autocompleteMatch > 0) {
      reasons.push('autocomplete attribute');
    }
    if (scoreBreakdown.nameAttributeMatch > 0) {
      reasons.push('name attribute');
    }
    if (scoreBreakdown.typeBonus > 0) {
      reasons.push('input type alignment');
    }
    if (scoreBreakdown.partialMatch > 0) {
      reasons.push('partial text match');
    }

    const confidence = Math.round(scoreBreakdown.totalScore * 100);
    const reasonText = reasons.length > 0 ? reasons.join(', ') : 'general similarity';
    
    return `${confidence}% confidence: ${reasonText}`;
  }

  /**
   * Determines appropriate DOM action for a field
   */
  private determineAction(field: FormFieldSchema): FieldMapping['action'] {
    if (field.elementType === 'select') {
      return 'selectByText';
    }
    
    if (field.options && field.options.length > 0) {
      return 'selectByText';
    }
    
    return 'setValue';
  }

  /**
   * Updates the underlying scorer's weights
   */
  updateScoringWeights(weights: Partial<HeuristicWeights>): void {
    this.scorer.updateWeights(weights);
  }
}