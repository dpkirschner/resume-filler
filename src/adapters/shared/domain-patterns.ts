/**
 * Domain Pattern Utilities for Vendor-Specific URL Matching
 * Provides reusable URL pattern matching logic for all adapters
 */

/**
 * Common domain pattern types used across different ATS platforms
 */
export interface DomainPattern {
  /** Exact domain matches */
  readonly domains: readonly string[];
  
  /** Regex patterns for complex domain matching */
  readonly patterns: readonly RegExp[];
  
  /** URL path patterns that indicate this vendor */
  readonly paths: readonly string[];
  
  /** Query parameter patterns */
  readonly queryParams: readonly string[];
}

/**
 * Predefined domain patterns for major ATS vendors
 */
export const VENDOR_DOMAIN_PATTERNS = {
  WORKDAY: {
    domains: ['workday.com', 'myworkday.com'],
    patterns: [
      /\.myworkday\.com$/,
      /\w+-\w+\.workday\.com$/,
      /\w+\.workday\.com$/
    ],
    paths: ['/jobs/', '/requisition/', '/career', '/apply'],
    queryParams: ['jobId', 'requisitionId']
  },
  
  GREENHOUSE: {
    domains: ['greenhouse.io', 'boards.greenhouse.io'],
    patterns: [
      /\.greenhouse\.io$/,
      /boards\.greenhouse\.io$/,
      /\.boards\.greenhouse\.io$/
    ],
    paths: ['/jobs/', '/job/', '/apply/'],
    queryParams: ['job_id', 'application_id']
  },
  
  LEVER: {
    domains: ['lever.co', 'jobs.lever.co'],
    patterns: [
      /jobs\.lever\.co$/,
      /\w+\.jobs\.lever\.co$/
    ],
    paths: ['/jobs/', '/apply/'],
    queryParams: ['lever-source']
  },
  
  BAMBOOHR: {
    domains: ['bamboohr.com'],
    patterns: [
      /\w+\.bamboohr\.com$/
    ],
    paths: ['/jobs/', '/careers/'],
    queryParams: ['jobId']
  }
} as const;

/**
 * URL matching utility class with comprehensive vendor detection
 */
export class DomainMatcher {
  /**
   * Checks if a URL matches any of the provided domain patterns
   */
  static matchesDomainPattern(url: string, pattern: DomainPattern): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();
      const searchParams = urlObj.searchParams;
      
      // Check exact domain matches
      if (this.matchesExactDomains(hostname, pattern.domains)) {
        return true;
      }
      
      // Check regex patterns
      if (this.matchesRegexPatterns(hostname, pattern.patterns)) {
        return true;
      }
      
      // Check path patterns (only if hostname contains any part of vendor domains)
      if (this.hasVendorHint(hostname, pattern.domains) && 
          this.matchesPathPatterns(pathname, pattern.paths)) {
        return true;
      }
      
      // Check query parameters (only with vendor hint)
      if (this.hasVendorHint(hostname, pattern.domains) &&
          this.matchesQueryParams(searchParams, pattern.queryParams)) {
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }
  
  /**
   * Checks if hostname exactly matches any domain or is a subdomain
   */
  private static matchesExactDomains(hostname: string, domains: readonly string[]): boolean {
    return domains.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  }
  
  /**
   * Checks if hostname matches any regex pattern
   */
  private static matchesRegexPatterns(hostname: string, patterns: readonly RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(hostname));
  }
  
  /**
   * Checks if any path pattern is present in the URL path
   */
  private static matchesPathPatterns(pathname: string, paths: readonly string[]): boolean {
    return paths.some(path => pathname.includes(path.toLowerCase()));
  }
  
  /**
   * Checks if any query parameter pattern is present
   */
  private static matchesQueryParams(searchParams: URLSearchParams, queryParams: readonly string[]): boolean {
    return queryParams.some(param => searchParams.has(param));
  }
  
  /**
   * Checks if hostname contains hints that it might be related to vendor
   */
  private static hasVendorHint(hostname: string, domains: readonly string[]): boolean {
    return domains.some(domain => {
      const baseDomain = domain.split('.')[0]; // e.g., 'workday' from 'workday.com'
      return hostname.includes(baseDomain);
    });
  }
  
  /**
   * Gets confidence score for URL match (0-1)
   */
  static getMatchConfidence(url: string, pattern: DomainPattern): number {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();
      const searchParams = urlObj.searchParams;
      
      let confidence = 0;
      
      // Exact domain match gives highest confidence
      if (this.matchesExactDomains(hostname, pattern.domains)) {
        confidence += 0.9;
      }
      
      // Regex pattern match gives high confidence
      if (this.matchesRegexPatterns(hostname, pattern.patterns)) {
        confidence += 0.8;
      }
      
      // Path pattern match adds moderate confidence
      if (this.matchesPathPatterns(pathname, pattern.paths)) {
        confidence += 0.3;
      }
      
      // Query parameter match adds some confidence
      if (this.matchesQueryParams(searchParams, pattern.queryParams)) {
        confidence += 0.2;
      }
      
      // Vendor hint in hostname adds minimal confidence
      if (this.hasVendorHint(hostname, pattern.domains)) {
        confidence += 0.1;
      }
      
      return Math.min(1.0, confidence);
    } catch {
      return 0;
    }
  }
  
  /**
   * Finds the best matching vendor for a URL
   */
  static findBestVendorMatch(url: string): {
    vendor: keyof typeof VENDOR_DOMAIN_PATTERNS | null;
    confidence: number;
  } {
    let bestMatch: keyof typeof VENDOR_DOMAIN_PATTERNS | null = null;
    let bestConfidence = 0;
    
    for (const [vendor, pattern] of Object.entries(VENDOR_DOMAIN_PATTERNS)) {
      const confidence = this.getMatchConfidence(url, pattern);
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = vendor as keyof typeof VENDOR_DOMAIN_PATTERNS;
      }
    }
    
    return { vendor: bestMatch, confidence: bestConfidence };
  }
  
  /**
   * Checks if URL is likely a job application form
   */
  static isJobApplicationUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const searchParams = urlObj.searchParams;
      
      // Common job application path indicators
      const jobPaths = [
        '/apply', '/application', '/job/', '/jobs/', '/career', '/careers/',
        '/requisition', '/opening', '/position', '/vacancy'
      ];
      
      // Common job application query parameters
      const jobParams = [
        'jobId', 'job_id', 'requisitionId', 'positionId', 'position_id',
        'opening_id', 'application_id', 'apply'
      ];
      
      // Check path patterns
      if (jobPaths.some(path => pathname.includes(path))) {
        return true;
      }
      
      // Check query parameters
      if (jobParams.some(param => searchParams.has(param))) {
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }
}

/**
 * Utilities for domain pattern validation and testing
 */
export class DomainPatternValidator {
  /**
   * Validates that a domain pattern is well-formed
   */
  static validatePattern(pattern: DomainPattern): string[] {
    const errors: string[] = [];
    
    if (!pattern.domains || pattern.domains.length === 0) {
      errors.push('At least one domain must be specified');
    }
    
    // Validate domains are properly formatted
    pattern.domains.forEach((domain, index) => {
      if (!domain || domain.trim().length === 0) {
        errors.push(`Domain at index ${index} is empty`);
      } else if (domain.includes('/') || domain.includes('?')) {
        errors.push(`Domain at index ${index} should not contain paths or query parameters`);
      }
    });
    
    // Validate regex patterns can be compiled
    pattern.patterns.forEach((regex, index) => {
      try {
        new RegExp(regex);
      } catch {
        errors.push(`Regex pattern at index ${index} is invalid`);
      }
    });
    
    return errors;
  }
  
  /**
   * Tests a domain pattern against a set of test URLs
   */
  static testPattern(
    pattern: DomainPattern, 
    testCases: Array<{ url: string; shouldMatch: boolean }>
  ): Array<{ url: string; expected: boolean; actual: boolean; passed: boolean }> {
    return testCases.map(testCase => {
      const actual = DomainMatcher.matchesDomainPattern(testCase.url, pattern);
      return {
        url: testCase.url,
        expected: testCase.shouldMatch,
        actual,
        passed: actual === testCase.shouldMatch
      };
    });
  }
}