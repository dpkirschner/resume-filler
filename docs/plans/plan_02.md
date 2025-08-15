# Task 4: Enhanced Form Schema Extractor Implementation Plan

## Overview
Build a production-grade form extraction system incorporating advanced label validation, intelligent selector generation, and performance optimizations based on real-world ATS platform challenges.

## Enhanced Architecture

### 1. Core Type Definitions (`src/types/index.ts`)
```typescript
interface FormFieldSchema {
  idx: number;
  label: string;
  labelSource: 'for-attribute' | 'wrapping-label' | 'aria-label' | 'aria-labelledby' | 'placeholder' | 'geometric-proximity' | 'fallback';
  labelConfidence: number; // 0-1 score for label accuracy
  selector: string;
  fallbackSelectors: string[]; // Backup selectors for reliability
  attributes: FormFieldAttributes;
  options: SelectOption[] | null;
  boundingRect?: DOMRect; // For debugging and validation
}

interface GeometricValidationConfig {
  maxVerticalDistance: number; // 50px
  maxHorizontalDistance: number; // 200px
  sameRowTolerance: number; // 10px
}
```

### 2. Smart Debounced Extraction (`src/content/extractors/extraction-manager.ts`)

**Performance-Optimized MutationObserver:**
```typescript
class ExtractionManager {
  private debounceTimer: number | null = null;
  private readonly DEBOUNCE_DELAY = 300; // ms
  private readonly MAX_EXTRACTION_DELAY = 2000; // Force extraction after 2s
  
  private debouncedExtract = () => {
    // Only re-extract if form elements actually changed
    if (this.hasFormElementsChanged()) {
      this.extractFormSchema();
    }
  };
  
  private hasFormElementsChanged(): boolean {
    // Intelligent change detection - check if form elements were added/removed
    // More efficient than full re-extraction on every DOM change
  }
}
```

**Key Features:**
- Smart change detection (form elements only, not cosmetic changes)
- Progressive timeout (force extraction if changes never stabilize)
- Memory-efficient observer management with cleanup

### 3. Geometric Label Validation (`src/content/extractors/geometric-validator.ts`)

**Spatial Proximity Algorithm:**
```typescript
class GeometricValidator {
  validateLabelProximity(
    inputElement: HTMLElement, 
    textNode: Text | HTMLElement,
    config: GeometricValidationConfig
  ): { isValid: boolean; confidence: number; reason: string } {
    
    const inputRect = inputElement.getBoundingClientRect();
    const textRect = this.getTextBoundingRect(textNode);
    
    // Handle edge cases: zero dimensions, off-screen elements
    if (this.isInvalidRect(inputRect) || this.isInvalidRect(textRect)) {
      return { isValid: false, confidence: 0, reason: 'Invalid bounding rect' };
    }
    
    // Vertical proximity check (same row or reasonable distance)
    const verticalDistance = this.calculateVerticalDistance(inputRect, textRect);
    const horizontalAlignment = this.calculateHorizontalAlignment(inputRect, textRect);
    
    // Confidence scoring based on proximity and alignment
    const confidence = this.calculateProximityConfidence(verticalDistance, horizontalAlignment);
    
    return {
      isValid: confidence > 0.6,
      confidence,
      reason: `Vertical: ${verticalDistance}px, Alignment: ${horizontalAlignment}`
    };
  }
}
```

**Advanced Features:**
- Multi-column layout detection
- Reading direction awareness (LTR/RTL)
- Scroll container handling
- Visual containment validation (same form section)

### 4. Hybrid Selector Generation (`src/content/extractors/advanced-selector-generator.ts`)

**CSS Selector Library Integration:**
```typescript
import { getCssSelector } from 'css-selector-generator'; // or optimal-select

class AdvancedSelectorGenerator {
  async generateOptimalSelector(element: HTMLElement): Promise<SelectorResult> {
    const selectors: SelectorCandidate[] = [];
    
    // Strategy 1: High-confidence manual selectors
    selectors.push(...this.generateManualSelectors(element));
    
    // Strategy 2: CSS selector library (with timeout)
    try {
      const librarySelector = await this.withTimeout(
        () => getCssSelector(element, { 
          blacklist: [/^css-/, /^r-\d+/, /^_\w+/], // Filter auto-generated classes
          whitelist: ['[data-testid]', '[name]', '[id]']
        }),
        1000 // 1s timeout
      );
      selectors.push({ selector: librarySelector, confidence: 0.8, source: 'library' });
    } catch (error) {
      console.warn('CSS selector library failed:', error);
    }
    
    // Strategy 3: Manual structural fallbacks
    selectors.push(...this.generateStructuralSelectors(element));
    
    // Validate and score all selectors
    return this.selectBestSelector(selectors);
  }
}
```

**Reliability Features:**
- Blacklist for auto-generated class names (css-*, r-*, _*)
- Whitelist for stable attributes (data-testid, name, id)
- Multiple selector validation and scoring
- Performance timeout protection

### 5. Enhanced Label Association (`src/content/extractors/label-associator.ts`)

**Multi-Strategy Label Detection:**
```typescript
class LabelAssociator {
  associateLabel(element: HTMLFormElement): LabelResult {
    const strategies = [
      () => this.findByForAttribute(element),
      () => this.findByWrappingLabel(element),
      () => this.findByAriaLabel(element),
      () => this.findByAriaLabelledBy(element),
      () => this.findByPlaceholder(element),
      () => this.findByGeometricProximity(element), // NEW: Enhanced with geometric validation
      () => this.findByParentContext(element) // NEW: Improved heuristic
    ];
    
    for (const strategy of strategies) {
      const result = strategy();
      if (result.confidence > 0.7) {
        return result;
      }
    }
    
    // Return best fallback with confidence score
    return this.selectBestFallback(strategies.map(s => s()));
  }
  
  private findByGeometricProximity(element: HTMLFormElement): LabelResult {
    const nearbyTextNodes = this.findNearbyTextNodes(element);
    
    for (const textNode of nearbyTextNodes) {
      const validation = this.geometricValidator.validateLabelProximity(
        element, textNode, this.geometricConfig
      );
      
      if (validation.isValid) {
        return {
          label: textNode.textContent.trim(),
          confidence: validation.confidence,
          source: 'geometric-proximity',
          debug: validation.reason
        };
      }
    }
    
    return { label: '', confidence: 0, source: 'geometric-proximity' };
  }
}
```

### 6. Error Handling & Fallback Strategy

**Graceful Degradation:**
- Geometric validation failures → fallback to text-based heuristics
- CSS library timeouts → use manual selector generation
- Performance issues → simplified extraction with core features only
- Memory constraints → cleanup and retry with reduced scope

**User Experience Considerations:**
- Maximum 2-second extraction time before showing progress indicator
- Incremental results (show partial extraction while processing)
- Clear error messages for debugging
- Performance metrics logging

### 7. Implementation Phases

**Phase 1: Smart Foundation (Week 1)**
- Debounced MutationObserver with intelligent change detection
- Core extraction logic with performance monitoring
- Basic label association (for/id, wrapping)
- Simple manual selector generation
- Comprehensive unit tests

**Phase 2: Geometric Enhancement (Week 2)**
- Implement getBoundingRect() proximity validation
- Advanced label association with spatial algorithms
- Edge case handling (hidden elements, scroll containers)
- Visual regression tests with real ATS samples

**Phase 3: Advanced Selectors (Week 3)**
- Research and integrate css-selector-generator library
- Hybrid selector generation with fallbacks
- Selector validation and confidence scoring
- Performance optimization for large DOMs

**Phase 4: Production Hardening (Week 4)**
- Shadow DOM traversal support
- Framework-specific optimizations (React/Vue re-renders)
- Memory management and cleanup
- Integration testing with background script
- Error telemetry and monitoring

### 8. Testing Strategy

**Advanced Test Coverage:**
- **Geometric Tests**: Visual proximity validation with synthetic layouts
- **Performance Tests**: Large DOM extraction benchmarks (1000+ fields)
- **Timing Tests**: Debounce logic validation with controlled mutations
- **Real-world Tests**: Actual ATS platform samples (Workday, Greenhouse, Lever)
- **Accessibility Tests**: Screen reader compatibility, high contrast mode
- **Memory Tests**: Long-running extraction cycles with cleanup validation

### 9. Key Improvements Over Initial Plan

**Based on Critical Feedback:**

1. **Geometric Label Validation**: Addresses the major weakness in text-based heuristics by using `getBoundingClientRect()` to validate spatial relationships between inputs and potential labels.

2. **CSS Selector Library Integration**: Replaces brittle manual structural selectors with battle-tested libraries that handle modern framework complexities (auto-generated classes, dynamic DOM).

3. **Smart Debounced Performance**: Prevents extraction storms on dynamic SPAs by intelligently detecting meaningful changes and using progressive timeouts.

**Technical Debt Mitigation:**
- Comprehensive error boundaries for each enhancement
- Fallback strategies ensure core functionality even if advanced features fail
- Performance monitoring to catch regressions early
- Memory management to prevent leaks in long-running sessions

### 10. Dependencies and Research Items

**NPM Dependencies to Evaluate:**
- `css-selector-generator` vs `optimal-select` for selector generation
- Consider bundle size impact on extension loading

**Research Required:**
- ATS platform-specific rendering patterns (especially Workday's dynamic loading)
- Browser compatibility for `getBoundingClientRect()` edge cases
- Performance benchmarks on realistic form sizes (100+ fields)

This enhanced plan addresses all critical feedback points while maintaining practical implementation timelines and comprehensive error handling.