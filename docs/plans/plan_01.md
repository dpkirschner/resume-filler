# Plan 01: Profile Management UI Implementation

**Phase:** 1 - Epic 1: Foundation  
**Task:** Build the Profile Management UI  
**Date:** August 15, 2025

## Overview
Implementation plan for Task 1 from Phase 1, focusing on building the core user-facing UI for managing profiles and configuring the extension with privacy-first design principles.

---

## Technology Choice: React with TypeScript

**Rationale:** Given the complexity of the CRUD operations, flexible profile schema, and the need for encrypted storage integration, React provides the best balance of developer experience and maintainability. The component-based architecture aligns well with the extension's modular design.

---

## Component Structure

```
src/ui/
├── components/
│   ├── ProfileField.tsx          # Individual field display/edit
│   ├── ProfileFieldForm.tsx      # Add/edit field modal
│   ├── ProfileList.tsx           # Field listing with CRUD actions
│   ├── EncryptionSettings.tsx    # Passphrase management
│   └── common/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Modal.tsx
├── pages/
│   ├── Popup.tsx                 # Main extension popup
│   └── Options.tsx               # Full settings page
└── hooks/
    ├── useProfile.tsx            # Profile state management
    ├── useStorage.tsx            # Encrypted storage operations
    └── useFieldValidation.tsx    # Form validation logic
```

---

## Data Flow & State Management

### State Architecture
- **Local Component State:** Form inputs and UI interactions
- **Custom Hooks:** Profile data and storage operations
- **Chrome Storage Integration:** Via dedicated storage service

### Key Data Flows
1. **Load Profile:** `useStorage.loadProfile(passphrase)` → decrypt → populate UI
2. **CRUD Operations:** Component → `useProfile` hook → `storage.js` → `chrome.storage.local`
3. **Encryption:** All profile operations go through `storage.js` encryption layer

---

## UI/UX Patterns for CRUD Operations

### Profile Field Management
- **List View:** Grouped by type (`personal`, `work`, `custom`, `eeo`)
- **Inline Editing:** Click field to edit in-place for quick changes
- **Modal Forms:** Complex operations (add new, bulk edit) use overlay modals
- **Field Types:** Support for text, select, textarea, and structured data (work experience)

### User Experience Flow
1. **First Run:** Onboarding wizard to create initial profile
2. **Daily Use:** Quick field edits from compact popup
3. **Advanced:** Full options page for complex profile management

### Security UX
- **Passphrase Prompt:** On first access and after timeout
- **Visual Indicators:** Lock icons, encryption status
- **Data Type Warnings:** Clear labeling of sensitive fields (`isSensitive: true`)

---

## Implementation Strategy

### Phase 1A: Core Infrastructure
1. Set up React + TypeScript build system
2. Implement `storage.js` with encryption (Task 2 dependency)
3. Create base components and hooks

### Phase 1B: Profile Management
1. Build ProfileList and ProfileField components
2. Implement CRUD operations with validation
3. Add encryption settings UI

### Phase 1C: Integration & Polish
1. Connect to Chrome storage
2. Add onboarding flow
3. Implement responsive design for popup constraints

---

## Key Design Decisions

### Flexible Schema Support
Use the data model's key-value structure to support user-defined fields without rigid schemas.

### Encryption UX
Optional passphrase with clear security implications explained to users.

### Validation Strategy
Client-side validation for UX + storage-level validation for security.

### Accessibility
Full keyboard navigation and screen reader support for all CRUD operations.

---

## Data Model Integration

### Profile Structure (from data_model.md)
```json
[
  {
    "label": "First Name",
    "value": "Jane",
    "type": "personal",
    "isSensitive": false
  },
  {
    "label": "Work Experience",
    "type": "workExperience",
    "isSensitive": false,
    "value": [
      {
        "title": "Senior Software Architect",
        "company": "Google",
        "location": "New York, NY",
        "startDate": "2022-01-01",
        "endDate": "Present",
        "description": "Led the design and development of privacy-first AI systems."
      }
    ]
  }
]
```

### Field Types to Support
- **personal:** Basic contact information
- **work:** Professional details and experience
- **custom:** User-defined fields
- **eeo:** Sensitive demographic information (with special handling)

---

## Security Considerations

### Privacy-First Design
- All data stored locally in `chrome.storage.local`
- Optional encryption with user-provided passphrase
- No cloud storage or data transmission
- Clear consent for sensitive field handling

### Encryption Integration
- Leverages Task 2's `storage.js` module
- Functions: `saveProfile(profileObject, passphrase)` and `loadProfile(passphrase)`
- Transparent encryption/decryption in UI layer

---

## Success Criteria

1. **Functional CRUD:** Users can add, edit, delete, and view profile fields
2. **Flexible Schema:** Support for custom field types and complex data structures
3. **Security Integration:** Seamless encryption/decryption with user passphrase
4. **Responsive UI:** Works in both popup (320px width) and options page contexts
5. **Accessibility:** Full keyboard navigation and screen reader compatibility
6. **Data Integrity:** Validation prevents corrupted profile data

---

## Dependencies

- **Task 2:** Encrypted Storage implementation (`storage.js`)
- **Build System:** React + TypeScript + Chrome Extension build pipeline
- **UI Framework:** Component library for consistent styling

---

## Next Steps

After plan approval:
1. Set up React + TypeScript build configuration
2. Implement base component library
3. Create profile management hooks
4. Build and test CRUD interface
5. Integrate with encrypted storage
6. Add comprehensive validation and error handling

This plan aligns with the product vision of privacy-first design while providing the flexibility needed for the extension's AI-powered features in later phases.