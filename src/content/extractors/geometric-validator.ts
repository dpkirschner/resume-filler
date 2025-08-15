/**
 * Geometric Validator - Spatial Proximity Validation
 * 
 * Uses getBoundingClientRect() to validate spatial relationships between
 * form elements and potential labels, preventing false associations with
 * distant headers or instructions.
 */

import { GeometricValidationConfig } from '../../types';

export class GeometricValidator {
  /**
   * Validate the spatial proximity between a form element and potential label
   * @param inputElement Form element
   * @param textElement Element containing potential label text
   * @param config Validation configuration
   * @param confidenceThreshold Minimum confidence required for validity (default: 0.6)
   * @returns Validation result with confidence score
   */
  validateLabelProximity(
    inputElement: HTMLElement,
    textElement: HTMLElement,
    config: GeometricValidationConfig,
    confidenceThreshold = 0.6
  ): { isValid: boolean; confidence: number; reason: string } {
    
    const inputRect = inputElement.getBoundingClientRect();
    const textRect = textElement.getBoundingClientRect();

    // Handle edge cases: zero dimensions, off-screen elements
    if (this.isInvalidRect(inputRect) || this.isInvalidRect(textRect)) {
      return {
        isValid: false,
        confidence: 0,
        reason: 'Invalid bounding rect - element may be hidden or off-screen'
      };
    }

    // Check if elements are in the same viewport
    if (!this.areInSameViewport(inputRect, textRect)) {
      return {
        isValid: false,
        confidence: 0,
        reason: 'Elements are not in the same viewport'
      };
    }

    // Calculate spatial relationships
    const verticalDistance = this.calculateVerticalDistance(inputRect, textRect);
    const horizontalAlignment = this.calculateHorizontalAlignment(inputRect, textRect);
    const isInSameRow = this.isInSameRow(inputRect, textRect, config.sameRowTolerance);
    
    // Calculate confidence based on proximity and alignment
    const confidence = this.calculateProximityConfidence(
      verticalDistance,
      horizontalAlignment,
      isInSameRow,
      config
    );

    const isValid = confidence >= confidenceThreshold;

    return {
      isValid,
      confidence,
      reason: `Vertical: ${verticalDistance.toFixed(1)}px, Horizontal alignment: ${horizontalAlignment.toFixed(1)}px, Same row: ${isInSameRow}`
    };
  }

  /**
   * Check if a bounding rect is invalid (hidden or zero-size element)
   * @param rect Bounding rectangle
   * @returns True if invalid
   */
  private isInvalidRect(rect: DOMRect): boolean {
    return rect.width === 0 || 
           rect.height === 0 || 
           (rect.x === 0 && rect.y === 0 && rect.width === 0 && rect.height === 0);
  }

  /**
   * Check if two elements are in the same viewport
   * @param rect1 First element's bounding rect
   * @param rect2 Second element's bounding rect
   * @returns True if both are in viewport
   */
  private areInSameViewport(rect1: DOMRect, rect2: DOMRect): boolean {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const isRect1InViewport = rect1.right > 0 && rect1.left < viewportWidth && 
                             rect1.bottom > 0 && rect1.top < viewportHeight;
    
    const isRect2InViewport = rect2.right > 0 && rect2.left < viewportWidth && 
                             rect2.bottom > 0 && rect2.top < viewportHeight;

    return isRect1InViewport && isRect2InViewport;
  }

  /**
   * Calculate vertical distance between two elements
   * @param inputRect Input element's bounding rect
   * @param textRect Text element's bounding rect
   * @returns Vertical distance in pixels
   */
  private calculateVerticalDistance(inputRect: DOMRect, textRect: DOMRect): number {
    // If elements overlap vertically, distance is 0
    if (inputRect.bottom >= textRect.top && inputRect.top <= textRect.bottom) {
      return 0;
    }

    // Calculate minimum vertical distance
    if (textRect.bottom < inputRect.top) {
      // Text is above input
      return inputRect.top - textRect.bottom;
    } else {
      // Text is below input
      return textRect.top - inputRect.bottom;
    }
  }

  /**
   * Calculate horizontal alignment between two elements
   * @param inputRect Input element's bounding rect
   * @param textRect Text element's bounding rect
   * @returns Horizontal alignment distance in pixels (0 = perfect left-edge alignment)
   */
  private calculateHorizontalAlignment(inputRect: DOMRect, textRect: DOMRect): number {
    // Return the absolute difference of the left edges for a true alignment score
    return Math.abs(inputRect.left - textRect.left);
  }

  /**
   * Check if elements are in the same row (similar y-coordinates)
   * @param inputRect Input element's bounding rect
   * @param textRect Text element's bounding rect
   * @param tolerance Tolerance in pixels
   * @returns True if elements are in the same row
   */
  private isInSameRow(inputRect: DOMRect, textRect: DOMRect, tolerance: number): boolean {
    const inputCenter = inputRect.top + inputRect.height / 2;
    const textCenter = textRect.top + textRect.height / 2;
    
    return Math.abs(inputCenter - textCenter) <= tolerance;
  }

  /**
   * Calculate confidence score based on spatial relationships
   * @param verticalDistance Vertical distance between elements
   * @param horizontalAlignment Horizontal alignment distance
   * @param isInSameRow Whether elements are in the same row
   * @param config Validation configuration
   * @returns Confidence score (0-1)
   */
  private calculateProximityConfidence(
    verticalDistance: number,
    horizontalAlignment: number,
    isInSameRow: boolean,
    config: GeometricValidationConfig
  ): number {
    // Score is based on how close to ideal (0 distance/alignment) we are
    // The score for each dimension is between 0 and 1
    const verticalScore = Math.max(0, 1 - (verticalDistance / config.maxVerticalDistance));
    const horizontalScore = Math.max(0, 1 - (horizontalAlignment / config.maxHorizontalDistance));

    // Weight the scores. Vertical alignment is often more important than horizontal
    // A common layout is a label directly above a left-aligned input
    let confidence = (verticalScore * 0.6) + (horizontalScore * 0.4);

    // Apply a bonus for being in the same row, as this is a strong signal
    if (isInSameRow) {
      confidence += 0.2;
    }

    return Math.min(1, confidence); // Clamp the final score between 0 and 1
  }

  /**
   * Get text bounding rect, handling text nodes
   * @param textNode Text node or element
   * @returns Bounding rectangle
   */
  getTextBoundingRect(textNode: Text | HTMLElement): DOMRect {
    if (textNode instanceof Text) {
      const range = document.createRange();
      range.selectNode(textNode);
      return range.getBoundingClientRect();
    } else {
      return textNode.getBoundingClientRect();
    }
  }

  /**
   * Check if an element has valid dimensions (greater than zero)
   * @param element Element to check
   * @returns True if element has valid width and height
   */
  hasValidDimensions(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /**
   * Check if elements are in a logical form layout relationship
   * @param inputRect Input element's bounding rect
   * @param textRect Text element's bounding rect
   * @returns Layout relationship type
   */
  getLayoutRelationship(inputRect: DOMRect, textRect: DOMRect): 'above' | 'left' | 'right' | 'below' | 'overlapping' | 'distant' {
    const verticalDistance = this.calculateVerticalDistance(inputRect, textRect);
    const horizontalAlignment = this.calculateHorizontalAlignment(inputRect, textRect);
    
    // Check for overlap
    if (verticalDistance === 0 && horizontalAlignment === 0) {
      return 'overlapping';
    }

    // Check for same row (left/right relationship)
    if (this.isInSameRow(inputRect, textRect, 10)) {
      if (textRect.right < inputRect.left) {
        return 'left';
      } else if (textRect.left > inputRect.right) {
        return 'right';
      }
    }

    // Check for above/below relationship
    if (horizontalAlignment <= 50) { // Some horizontal alignment tolerance
      if (textRect.bottom < inputRect.top) {
        return 'above';
      } else if (textRect.top > inputRect.bottom) {
        return 'below';
      }
    }

    return 'distant';
  }
}