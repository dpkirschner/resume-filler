/**
 * Form Extractor Unit Tests
 * * Tests the FormExtractor class in isolation by mocking its dependencies.
 * Verifies its orchestration, error handling, and element filtering logic.
 */

import { FormExtractor } from '../../../src/content/extractors/form-extractor';
import { LabelAssociator } from '../../../src/content/extractors/label-associator';
import { SelectorGenerator } from '../../../src/content/extractors/selector-generator';
import { GeometricValidator } from '../../../src/content/extractors/geometric-validator';
import { DOMTestHelper, ExtractionAssertions } from '../../fixtures/test-helpers';
import { basicForm, edgeCasesForm } from '../../fixtures/form-layouts';

jest.mock('../../../src/content/extractors/label-associator');
jest.mock('../../../src/content/extractors/selector-generator');
jest.mock('../../../src/content/extractors/geometric-validator');

const MockLabelAssociator = LabelAssociator as jest.MockedClass<typeof LabelAssociator>;
const MockSelectorGenerator = SelectorGenerator as jest.MockedClass<typeof SelectorGenerator>;
const MockGeometricValidator = GeometricValidator as jest.MockedClass<typeof GeometricValidator>;

describe('FormExtractor', () => {
  let extractor: FormExtractor;
  let mockLabelAssociator: jest.Mocked<LabelAssociator>;
  let mockSelectorGenerator: jest.Mocked<SelectorGenerator>;
  let mockGeometricValidator: jest.Mocked<GeometricValidator>;

  beforeEach(() => {
    jest.clearAllMocks();
    extractor = new FormExtractor();

    mockLabelAssociator = MockLabelAssociator.mock.instances[0] as jest.Mocked<LabelAssociator>;
    mockSelectorGenerator = MockSelectorGenerator.mock.instances[0] as jest.Mocked<SelectorGenerator>;
    mockGeometricValidator = MockGeometricValidator.mock.instances[0] as jest.Mocked<GeometricValidator>;

    // ✨ FIX: Mock hasValidDimensions to return true by default for all tests.
    // This simulates a rendered DOM where elements have dimensions.
    mockGeometricValidator.hasValidDimensions.mockReturnValue(true);

    mockLabelAssociator.associateLabel.mockResolvedValue({
      label: 'Mocked Label', source: 'for-attribute', confidence: 0.95,
    });
    mockSelectorGenerator.generateOptimalSelector.mockResolvedValue({
      primary: '#mock-selector', fallbacks: ['[name="mock"]',], confidence: 0.9,
    });
  });

  afterEach(() => {
    DOMTestHelper.cleanup();
  });

  describe('extractFormSchema', () => {
    it('should find and process all visible form fields in a basic form', async () => {
      const container = DOMTestHelper.setupFixture(basicForm);
      const expectedFieldCount = 4;

      const schema = await extractor.extractFormSchema();

      expect(schema.fields).toHaveLength(expectedFieldCount);
      expect(mockLabelAssociator.associateLabel).toHaveBeenCalledTimes(expectedFieldCount);
      expect(mockSelectorGenerator.generateOptimalSelector).toHaveBeenCalledTimes(expectedFieldCount);

      const firstField = schema.fields[0];
      expect(firstField.label).toBe('Mocked Label');
      expect(firstField.selector).toBe('#mock-selector');
      expect(firstField.elementType).toBe('input');
    });

    it('should return an empty schema if no form fields are found', async () => {
      DOMTestHelper.setupFixture({ name: 'Empty', description: '', html: '<div>No forms here</div>', expectedFields: 0 });
      const schema = await extractor.extractFormSchema();
      expect(schema.fields).toHaveLength(0);
    });

    it('should ignore hidden and disabled fields', async () => {
      DOMTestHelper.setupFixture(edgeCasesForm);
      const schema = await extractor.extractFormSchema();
      expect(schema.fields).toHaveLength(3);
    });

    it('should ignore elements that are not visually rendered', async () => {
        const html = `
            <input name="visible" />
            <input name="hidden-by-style" style="display: none;" />
        `;
        DOMTestHelper.setupFixture({ name: 'Visibility Test', html, expectedFields: 1, description: '' });
  
        // Override the default mock for this specific test case.
        const visibleElement = document.querySelector('[name="visible"]') as HTMLElement;
        const hiddenElement = document.querySelector('[name="hidden-by-style"]') as HTMLElement;
        mockGeometricValidator.hasValidDimensions.mockImplementation((element) => {
            return element === visibleElement; // Only the visible element has dimensions.
        });
  
        const schema = await extractor.extractFormSchema();
  
        expect(schema.fields).toHaveLength(1);
        expect(mockLabelAssociator.associateLabel).toHaveBeenCalledWith(visibleElement);
        expect(mockLabelAssociator.associateLabel).not.toHaveBeenCalledWith(hiddenElement);
    });
  });

  describe('processFormElement', () => {
    it('should correctly extract options from a select element', async () => {
        const html = `
            <select name="country">
                <option value="us">United States</option>
                <option value="ca">Canada</option>
            </select>
        `;
        DOMTestHelper.setupFixture({ name: 'Select Test', html, expectedFields: 1, description: '' });

        const schema = await extractor.extractFormSchema();
        const selectField = schema.fields[0];

        expect(selectField.elementType).toBe('select');
        expect(selectField.options).toHaveLength(2);
        expect(selectField.options).toEqual([
            { value: 'us', text: 'United States' },
            { value: 'ca', text: 'Canada' },
        ]);
    });
  });
});