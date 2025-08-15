# Job Application Co-Pilot - Development Context

## Project Overview
A privacy-first Chrome extension that acts as a **Career Co-Pilot**, helping users complete job applications faster and more effectively. The extension intelligently autofills forms from a secure local profile and provides AI-driven strategic suggestions for key fields like salary.

## Key Architecture Components

### Three-Tiered Mapping Engine
1. **Vendor Adapters** - Pre-defined CSS selectors for major ATS platforms (Workday, Greenhouse, Lever)
2. **Heuristic Mapping** - Form field mapping using `autocomplete`, `name`, `id` attributes
3. **LLM Fallback** - Anonymized schema mapping (NO PII sent to LLMs)

### Core Components
- **Content Scripts**: Form extraction, DOM filling, preview modal
- **Background Script**: Mapping engine orchestration
- **Extension UI**: Profile management and settings
- **Flow Orchestrator**: Multi-page application state management
- **AI Augmentation Engine** (Post-MVP): Backend service for market data suggestions

## Privacy & Security Requirements
- **Local-first**: All profile data stored in `chrome.storage.local`
- **Encrypted at rest**: Profile data encryption
- **Anonymized LLM calls**: Only form/profile schemas sent, never user values
- **User confirmation**: Preview modal required before any form modifications
- **Opt-in sensitive fields**: EEO fields filled only with explicit consent

## Technology Stack
- **Chrome Extension**: Manifest V3
- **Storage**: `chrome.storage.local` with encryption
- **LLM Integration**: Local (Ollama) or cloud (OpenAI/Anthropic) with user API keys
- **Backend** (Post-MVP): Secure service for external data integration

## User Flow
1. User navigates to job application form
2. Extension detects form fields and extracts schema
3. Mapping engine matches fields using three-tiered approach
4. Preview modal shows proposed fills with source attribution
5. User confirms/modifies suggestions
6. Extension fills approved fields
7. Multi-page flow management continues across application pages

## Development Priorities
1. **MVP**: Basic autofill with vendor adapters and heuristics
2. **v2.0**: LLM fallback mapping, custom profile fields
3. **Post-MVP**: AI salary suggestions, market data integration

## Success Metrics
- Autofill success rate ≥ 95% on top 5 ATS platforms
- Mapping latency ≤ 2 seconds
- Zero PII leaks without explicit user action
- 30%+ adoption rate for AI suggestions (Post-MVP)

## Risk Mitigations
- Preview modal prevents incorrect sensitive field mapping
- Multiple data providers for backend resilience
- Adapter health monitoring with graceful fallbacks
- Clear source attribution for AI suggestions

## Testing Requirements
Always run these commands before committing:
- `npm run lint` - Code linting
- `npm run typecheck` - TypeScript validation
- `npm test` - Unit tests
- Manual testing on major ATS platforms (Workday, Greenhouse, Lever)

## File Structure Notes
- `/src/content/` - Content scripts for form interaction
- `/src/background/` - Service worker and mapping engine
- `/src/ui/` - Extension popup and options pages
- `/src/adapters/` - Vendor-specific CSS selectors
- `/src/mapping/` - Heuristic mapping logic
- `/src/llm/` - LLM integration with anonymization
- `/docs/` - Product specifications and architecture docs