/**
 * Background Service Worker - Job Application Co-Pilot
 * Handles mapping engine orchestration and communication between content scripts and UI
 */

import { ExtractorMessage, UserProfile, ExtractedFormSchema, MappingResult, FieldMapping } from '../types';
import { MappingEngine, DEFAULT_MAPPING_CONFIG } from './mapping-engine';
import { Logger } from '../utils';

const logger = new Logger('Background');
const mappingEngine = new MappingEngine(DEFAULT_MAPPING_CONFIG);

logger.info('Job Application Co-Pilot background script loaded');
logger.debug('Available adapters:', mappingEngine.getAvailableAdapters());

/**
 * Message handler for communication with content scripts
 */
chrome.runtime.onMessage.addListener((
  message: ExtractorMessage,
  sender,
  _sendResponse
) => {
  // Handle async responses
  (async () => {
    try {
      switch (message.type) {
        case 'FORM_SCHEMA_EXTRACTED':
          await handleFormSchemaExtracted(message.payload, sender);
          break;
          
        case 'EXTRACTION_ERROR':
          logger.error('Extraction error from content script:', message.payload);
          break;
          
        default:
          logger.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      logger.error('Error handling message:', error);
    }
  })();
  
  // Return true to indicate async response
  return true;
});

/**
 * Handles form schema extraction from content scripts
 */
async function handleFormSchemaExtracted(
  formSchema: ExtractedFormSchema, 
  sender: chrome.runtime.MessageSender
): Promise<void> {
  logger.info(`Received form schema with ${formSchema.fields.length} fields from ${formSchema.url}`);
  
  try {
    // Load user profile from storage
    const userProfile = await loadUserProfile();
    
    if (!userProfile || userProfile.length === 0) {
      logger.warn('No user profile found - cannot perform mapping');
      await sendMappingError(sender.tab?.id, 'No user profile configured');
      return;
    }
    
    // Perform mapping using the three-tiered engine
    logger.debug('Starting mapping process...');
    const mappingResult = await mappingEngine.mapFormFields(formSchema, userProfile);
    
    // Send mapping results back to content script
    if (sender.tab?.id) {
      await sendMappingResult(sender.tab.id, mappingResult);
    }
    
    // Log results for debugging
    logMappingResults(mappingResult, formSchema);
    
  } catch (error) {
    logger.error('Error during mapping process:', error);
    await sendMappingError(
      sender.tab?.id, 
      error instanceof Error ? error.message : 'Unknown mapping error'
    );
  }
}

/**
 * Loads user profile from chrome storage
 */
async function loadUserProfile(): Promise<UserProfile | null> {
  try {
    const result = await chrome.storage.local.get('user_profile');
    
    if (!result.user_profile) {
      logger.debug('No user profile found in storage');
      return null;
    }
    
    // TODO: Handle profile decryption when encryption is implemented
    const profile = JSON.parse(result.user_profile) as UserProfile;
    logger.debug(`Loaded profile with ${profile.length} fields`);
    
    return profile;
  } catch (error) {
    logger.error('Error loading user profile:', error);
    return null;
  }
}

/**
 * Sends mapping results to content script
 */
async function sendMappingResult(tabId: number, mappingResult: MappingResult): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'MAPPING_READY',
      payload: mappingResult
    });
    
    logger.debug('Mapping results sent to content script');
  } catch (error) {
    logger.error('Error sending mapping results:', error);
  }
}

/**
 * Sends mapping error to content script
 */
async function sendMappingError(tabId: number | undefined, errorMessage: string): Promise<void> {
  if (!tabId) return;
  
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'MAPPING_ERROR',
      payload: { error: errorMessage }
    });
  } catch (error) {
    logger.error('Error sending mapping error:', error);
  }
}

/**
 * Logs comprehensive mapping results for debugging
 */
function logMappingResults(mappingResult: MappingResult, formSchema: ExtractedFormSchema): void {
  const { mappings, unmappedFields, processingTime, source } = mappingResult;
  const totalFields = formSchema.fields.length;
  const successRate = totalFields > 0 ? (mappings.length / totalFields * 100).toFixed(1) : '0';
  
  logger.info(`Mapping Summary:
    • Total fields: ${totalFields}
    • Mapped: ${mappings.length} (${successRate}%)
    • Unmapped: ${unmappedFields.length}
    • Processing time: ${processingTime}ms
    • Primary source: ${source}
  `);
  
  if (mappings.length > 0) {
    const sampleMappings = mappings.slice(0, 3).map((m: FieldMapping) => 
      `${m.formFieldIdx} -> ${m.profileKey} (${m.confidence.toFixed(2)})`
    );
    logger.debug('Sample mappings:', sampleMappings);
  }
  
  if (mappingResult.metadata?.vendorAdapter) {
    logger.debug(`Used vendor adapter: ${mappingResult.metadata.vendorAdapter}`);
  }
  
  if (mappingResult.metadata?.heuristicStats) {
    const stats = mappingResult.metadata.heuristicStats;
    logger.debug(`Heuristic stats: High: ${stats.highConfidenceMatches}, ` +
                `Medium: ${stats.mediumConfidenceMatches}, Low: ${stats.lowConfidenceMatches}`);
  }
}

/**
 * Extension lifecycle handlers
 */
chrome.runtime.onInstalled.addListener((details) => {
  logger.info('Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Set up default configuration
    setupDefaultConfiguration();
  }
});

chrome.runtime.onStartup.addListener(() => {
  logger.info('Extension started');
});

/**
 * Sets up default configuration on first install
 */
async function setupDefaultConfiguration(): Promise<void> {
  try {
    // Initialize empty user profile if none exists
    const existing = await chrome.storage.local.get('user_profile');
    if (!existing.user_profile) {
      await chrome.storage.local.set({
        user_profile: JSON.stringify([])
      });
      logger.info('Initialized empty user profile');
    }
    
    // Set default user settings
    const defaultSettings = {
      llmProvider: 'ollama',
      enableTelemetry: false,
      enableFeedback: true
    };
    
    await chrome.storage.local.set({
      user_settings: JSON.stringify(defaultSettings)
    });
    
    logger.info('Default configuration initialized');
  } catch (error) {
    logger.error('Error setting up default configuration:', error);
  }
}