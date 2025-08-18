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
- **Chrome Extension**: Manifest V3 with TypeScript
- **Frontend**: React with custom hooks for state management
- **Storage**: `chrome.storage.local` with encryption at rest
- **LLM Integration**: Local (Ollama default) or cloud (OpenAI/Anthropic) with user API keys
- **Testing**: Jest with unit, integration, and e2e test suites
- **Build System**: Vite with TypeScript configuration
- **Backend** (Post-MVP): Secure microservice for external data integration

## User Flow
1. User navigates to job application form
2. Extension detects form fields and extracts schema
3. Mapping engine matches fields using three-tiered approach
4. Preview modal shows proposed fills with source attribution
5. User confirms/modifies suggestions
6. Extension fills approved fields
7. Multi-page flow management continues across application pages

## Development Phases & Current Status
**Current Phase: Phase 1 - Core Autofill MVP**

### Phase 1 (In Progress) - Core Autofill MVP
- Profile Management Module with flexible key-value storage
- Onboarding & LLM Setup UI for graceful "no local LLM" handling
- Form Schema Extractor with stable CSS selectors + XPath fallback
- Hybrid Mapping Engine (Vendor Adapters → Heuristics → LLM)
- Preview & Confirmation Modal with source attribution
- Success target: ≥90% autofill success on top 3 ATS platforms

### Phase 2 - Multi-Page Flow Management
- Flow Orchestrator for session detection across pages
- Stateful mapping reuse with cached confirmations
- Non-intrusive toast notifications for continuation

### Phase 3 - Mapping Engine Optimization
- Privacy-preserving user feedback loop (opt-in)
- Heuristic tuning with semantic matching
- Adapter health checks and automated testing
- Target: ≥95% success rate, <10% LLM fallback usage

### Phase 4 - AI Augmentation Engine
- Backend microservice for strategic suggestions
- Secure extension ↔ backend API integration
- Salary suggestions with market data integration
- Target: >30% adoption rate for AI suggestions

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

## Key Implementation Details

### Mapping Engine Priority Logic
1. **Vendor Adapters**: High-confidence CSS selectors for known ATS platforms
2. **Heuristic Mapping**: Attribute scoring using `autocomplete`, `name`, `id`, `placeholder`
3. **LLM Fallback**: Anonymous schema-only mapping with confidence scoring

### Security & Privacy Implementation
- Profile encryption with optional user passphrase
- Anonymized LLM payloads containing only field labels/attributes (no values)
- Preview modal with source attribution before any DOM modifications
- Explicit opt-in for sensitive EEO field filling

### DOM Interaction Strategy
- Stable CSS selector generation with XPath fallback
- Proper event dispatching (`input`, `change`, `blur`) for framework compatibility
- Geometric validation to ensure field visibility and interactability

### Multi-Page Flow Management
- Flow detection using URL patterns and DOM markers
- Cached mapping reuse within application sessions
- State persistence across page navigation

## Testing Requirements
Always run these commands before committing:
- `npm run lint` - Code linting
- `npm run typecheck` - TypeScript validation
- `npm test` - Unit tests
- Manual testing on major ATS platforms (Workday, Greenhouse, Lever)

## Data Models & Storage
### Core Data Structures
- **`userProfile`**: Flexible key-value profile with encryption (`chrome.storage.local`)
- **`userSettings`**: LLM provider config, API keys (encrypted), telemetry preferences
- **`activeFlows`**: Multi-page application state management with cached mappings
- **`llmMappingPayload`**: Anonymized form/profile schemas (NO PII)
- **`llmMappingResponse`**: Structured mapping instructions with confidence scores

### Storage Strategy
- Local-first with `chrome.storage.local`
- Profile data encrypted at rest with optional user passphrase
- Flow state management for multi-page applications
- Cached mappings to reduce LLM calls in same session

## File Structure Notes
- `/src/content/` - Content scripts for form interaction
  - `/extractors/` - Form schema extraction and selector generation
  - `/fillers/` - DOM manipulation and event dispatching
- `/src/background/` - Service worker and mapping engine
- `/src/ui/` - Extension popup and options pages
  - `/components/` - React components with encryption settings
  - `/hooks/` - Custom hooks for profile and encryption management
- `/src/adapters/` - Vendor-specific CSS selectors (Workday, Greenhouse, Lever)
- `/src/mapping/` - Heuristic mapping logic with attribute weighting
- `/src/llm/` - LLM integration with anonymization pipeline
- `/src/storage/` - Encrypted storage management
- `/src/types/` - TypeScript type definitions
- `/docs/` - Product specifications and architecture docs
  - `product.md` - Complete v2.0 specification
  - `data_model.md` - JSON schemas for all data structures
  - `milestones.md` - Five-phase development roadmap