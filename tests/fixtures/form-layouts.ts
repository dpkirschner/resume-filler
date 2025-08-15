/**
 * Realistic Form Layout Fixtures
 * * Test fixtures based on real ATS platform patterns (Workday, Greenhouse, Lever)
 * for comprehensive testing of form extraction logic.
 */

export interface FormLayoutFixture {
  name: string;
  description: string;
  html: string;
  expectedFields: number;
  platform?: 'workday' | 'greenhouse' | 'lever' | 'generic';
}

/**
 * Basic form with standard label associations
 */
export const basicForm: FormLayoutFixture = {
  name: 'Basic Contact Form',
  description: 'Simple form with proper label-for associations',
  html: `
    <form data-testid="contact-form">
      <div>
        <label for="firstName">First Name *</label>
        <input type="text" id="firstName" name="firstName" required />
      </div>
      <div>
        <label for="lastName">Last Name *</label>
        <input type="text" id="lastName" name="lastName" required />
      </div>
      <div>
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" />
      </div>
      <div>
        <label for="phone">Phone Number</label>
        <input type="tel" id="phone" name="phone" />
      </div>
    </form>
  `,
  expectedFields: 4,
  platform: 'generic'
};

/**
 * Workday-style form with complex nested structure
 */
export const workdayForm: FormLayoutFixture = {
  name: 'Workday Application Form',
  description: 'Complex nested form mimicking Workday ATS structure',
  html: `
    <div class="wd-container">
      <div class="wd-field-group">
        <div class="wd-field-wrapper">
          <label class="wd-label">First Name</label>
          <div class="wd-input-wrapper">
            <input type="text" class="wd-input" data-automation-id="firstName" />
          </div>
        </div>
        <div class="wd-field-wrapper">
          <label class="wd-label">Last Name</label>
          <div class="wd-input-wrapper">
            <input type="text" class="wd-input" data-automation-id="lastName" />
          </div>
        </div>
      </div>
      <div class="wd-field-group">
        <div class="wd-field-wrapper">
          <label class="wd-label">Current Location</label>
          <div class="wd-input-wrapper">
            <select class="wd-select" data-automation-id="location">
              <option value="">Select Location</option>
              <option value="us">United States</option>
              <option value="ca">Canada</option>
              <option value="uk">United Kingdom</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `,
  expectedFields: 3,
  platform: 'workday'
};

/**
 * Greenhouse-style form with aria-labels
 */
export const greenhouseForm: FormLayoutFixture = {
  name: 'Greenhouse Application Form',
  description: 'Form using aria-label for accessibility',
  html: `
    <div class="application-form">
      <div class="field-container">
        <input 
          type="text" 
          aria-label="First Name" 
          placeholder="First Name"
          class="form-field"
          name="first_name"
        />
      </div>
      <div class="field-container">
        <input 
          type="text" 
          aria-label="Last Name" 
          placeholder="Last Name"
          class="form-field"
          name="last_name"
        />
      </div>
      <div class="field-container">
        <textarea 
          aria-label="Cover Letter"
          placeholder="Tell us why you're interested in this role..."
          class="form-field textarea-field"
          name="cover_letter"
          rows="5"
        ></textarea>
      </div>
    </div>
  `,
  expectedFields: 3,
  platform: 'greenhouse'
};

/**
 * Form with geometric proximity challenges
 */
export const geometricChallengeForm: FormLayoutFixture = {
  name: 'Geometric Layout Challenge',
  description: 'Complex layout requiring geometric validation for label association',
  html: `
    <div class="complex-layout">
      <div style="display: flex; gap: 20px;">
        <div style="flex: 1;">
          <div style="margin-bottom: 15px;">
            <span style="display: block; margin-bottom: 5px;">Personal Information</span>
            <input type="text" name="firstName" placeholder="First Name" />
          </div>
          <div style="margin-bottom: 15px;">
            <span style="display: block; margin-bottom: 5px;">Contact Details</span>
            <input type="email" name="email" placeholder="Email" />
          </div>
        </div>
        <div style="flex: 1;">
          <div style="margin-bottom: 15px;">
            <span style="display: block; margin-bottom: 5px;">Work Information</span>
            <input type="text" name="company" placeholder="Current Company" />
          </div>
          <div style="margin-bottom: 15px;">
            <span style="display: block; margin-bottom: 5px;">Additional Info</span>
            <input type="tel" name="phone" placeholder="Phone Number" />
          </div>
        </div>
      </div>
      
      <div style="display: flex; align-items: center; gap: 10px; margin-top: 20px;">
        <span>Years of Experience:</span>
        <select name="experience">
          <option value="">Select</option>
          <option value="0-2">0-2 years</option>
          <option value="3-5">3-5 years</option>
          <option value="5+">5+ years</option>
        </select>
      </div>
    </div>
  `,
  expectedFields: 5,
  platform: 'generic'
};

/**
 * Form with accessibility challenges
 */
export const accessibilityForm: FormLayoutFixture = {
  name: 'Accessibility Challenge Form',
  description: 'Form testing aria-labelledby and complex label associations',
  html: `
    <div class="accessibility-form">
      <div class="form-section">
        <div id="name-section-title">Personal Information</div>
        <div class="field-group">
          <div id="first-name-label">First Name</div>
          <input 
            type="text" 
            aria-labelledby="name-section-title first-name-label"
            name="firstName"
          />
        </div>
        <div class="field-group">
          <div id="last-name-label">Last Name</div>
          <input 
            type="text" 
            aria-labelledby="name-section-title last-name-label"
            name="lastName"
          />
        </div>
      </div>
      
      <div class="form-section">
        <div id="contact-section-title">Contact Information</div>
        <div class="field-group">
          <div id="email-label">Email Address</div>
          <div id="email-help">We'll use this to contact you</div>
          <input 
            type="email" 
            aria-labelledby="contact-section-title email-label"
            aria-describedby="email-help"
            name="email"
          />
        </div>
      </div>
    </div>
  `,
  expectedFields: 3,
  platform: 'generic'
};

/**
 * Performance test form with many fields
 */
export const performanceForm: FormLayoutFixture = {
  name: 'Performance Test Form',
  description: 'Large form with 50+ fields for performance testing',
  html: `
    <form class="performance-test-form">
      ${Array.from({ length: 50 }, (_, i) => `
        <div class="field-wrapper">
          <label for="field-${i}">Field ${i + 1}</label>
          <input type="text" id="field-${i}" name="field-${i}" />
        </div>
      `).join('')}
    </form>
  `,
  expectedFields: 50,
  platform: 'generic'
};

/**
 * Form with edge cases
 */
export const edgeCasesForm: FormLayoutFixture = {
  name: 'Edge Cases Form',
  description: 'Form with hidden fields, disabled elements, and unusual structures',
  html: `
    <form class="edge-cases-form">
      <input type="hidden" name="csrf_token" value="abc123" />
      
      <div>
        <label for="disabled-field">Disabled Field</label>
        <input type="text" id="disabled-field" name="disabled" disabled />
      </div>
      
      <input type="text" name="no-label" placeholder="Field without label" />
      
      <div>
        <span>Multiple</span>
        <span>Labels</span>
        <label for="multi-label">Official Label</label>
        <input type="text" id="multi-label" name="multiLabel" />
      </div>
      
      <fieldset>
        <legend>Nested Section</legend>
        <div>
          <label for="nested-field">Nested Field</label>
          <input type="text" id="nested-field" name="nested" />
        </div>
      </fieldset>
      
      <div id="dynamic-container">
        </div>
    </form>
  `,
  expectedFields: 3, // no-label, multiLabel, nested (hidden and disabled excluded)
  platform: 'generic'
};

/**
 * Shadow DOM Fixture
 */
export const shadowDomForm: FormLayoutFixture = {
  name: 'Shadow DOM Form',
  description: 'Form with an input encapsulated in a Shadow DOM',
  html: `
    <host-element></host-element>
    <script>
      customElements.define('host-element', class extends HTMLElement {
        constructor() {
          super();
          const shadowRoot = this.attachShadow({ mode: 'open' });
          shadowRoot.innerHTML = \`
            <label for="shadow-input">Field in Shadow DOM</label>
            <input type="text" id="shadow-input" name="shadow_field" />
          \`;
        }
      });
    </script>
  `,
  expectedFields: 1,
  platform: 'generic'
};

/**
 * Repeatable Sections Fixture (Work History)
 */
export const repeatableSectionsForm: FormLayoutFixture = {
  name: 'Repeatable Sections Form (Work History)',
  description: 'Simulates a work history section with multiple identical groups of fields',
  html: `
    <div class="work-history-section">
      <div class="work-item">
        <label for="title-1">Job Title</label>
        <input id="title-1" name="title-1" type="text" />
        <label for="company-1">Company</label>
        <input id="company-1" name="company-1" type="text" />
      </div>
      <div class="work-item">
        <label for="title-2">Job Title</label>
        <input id="title-2" name="title-2" type="text" />
        <label for="company-2">Company</label>
        <input id="company-2" name="company-2" type="text" />
      </div>
    </div>
  `,
  expectedFields: 4,
  platform: 'generic'
};

/**
 * Complex Radio/Checkbox Group Fixture
 */
export const radioGroupForm: FormLayoutFixture = {
  name: 'Complex Radio/Checkbox Group Form',
  description: 'Tests label association with fieldset and legend elements',
  html: `
    <fieldset>
      <legend>Employment Type</legend>
      <div>
        <input type="radio" id="type-ft" name="employment_type" value="full-time">
        <label for="type-ft">Full-Time</label>
      </div>
      <div>
        <input type="radio" id="type-pt" name="employment_type" value="part-time">
        <label for="type-pt">Part-Time</label>
      </div>
    </fieldset>
  `,
  expectedFields: 2,
  platform: 'generic'
};


/**
 * All form fixtures for easy iteration
 */
export const allFormFixtures: FormLayoutFixture[] = [
  basicForm,
  workdayForm,
  greenhouseForm,
  geometricChallengeForm,
  accessibilityForm,
  performanceForm,
  edgeCasesForm,
  shadowDomForm,
  repeatableSectionsForm,
  radioGroupForm,
];

/**
 * Get fixtures by platform
 */
export function getFixturesByPlatform(platform: FormLayoutFixture['platform']): FormLayoutFixture[] {
  return allFormFixtures.filter(fixture => fixture.platform === platform);
}

/**
 * Get fixtures for performance testing
 */
export function getPerformanceFixtures(): FormLayoutFixture[] {
  return allFormFixtures.filter(fixture => 
    fixture.name.includes('Performance') || fixture.expectedFields > 20
  );
}