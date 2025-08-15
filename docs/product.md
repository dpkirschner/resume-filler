### **Project Name: Job Application Co-Pilot**
**Version:** 2.0
**Author:** [You]
**Date:** August 14, 2025

**Change Log (v2.0):**
* *Pivoted project vision from a simple "Autofill" to a "Co-Pilot" that provides strategic, AI-augmented suggestions.*
* *Formalized the mapping engine as a three-tiered hybrid model (Adapters -> Heuristics -> LLM).*
* *Specified that all LLM calls for mapping must be anonymized (schema-only).*
* *Added requirements for custom user profile fields and multi-page application flow management.*
* *Introduced a Post-MVP backend service for AI-driven data augmentation (e.g., salary suggestions).*

---

### ## 1. Purpose

This project will deliver a privacy-first Chrome extension that acts as a **Career Co-Pilot**, helping users complete job applications faster and more effectively. It will intelligently autofill forms from a secure local profile and, in its post-MVP phase, provide **data-driven strategic suggestions** for key fields like salary, giving users a competitive advantage in their job search.

---

### ## 2. Goals and Non-Goals

#### #### Goals
* Autofill personal details, work history, and custom user-defined fields on job application forms.
* Employ a **hybrid mapping engine** (vendor adapters, then heuristics) to maximize accuracy and performance, using an LLM only as a fallback.
* Ensure all LLM mapping calls are **anonymized**, sending only form/profile schemas, never user PII.
* Allow opt-in filling of sensitive EEO fields with user consent.
* Provide a clear user preview and confirmation before modifying any form fields.
* Store all profile data and user-provided API keys locally and securely.
* **[v2.0 Goal]** Introduce an AI Augmentation Engine to suggest optimized answers for specific fields (e.g., salary) based on external market data.
* **[v2.0 Goal]** Gracefully handle multi-page applications, maintaining state across a single job application flow.

#### #### Non-Goals
* Automatic form submission.
* Cloud-based profile storage (local-first design remains paramount).
* Solving CAPTCHAs or handling complex file uploads.
* **[v2.0 Non-Goal]** Real-time, long-form text generation for cover letters or essays (out of scope for this version).

---

### ## 3. User Stories

* **Basic Autofill:** As a user, I can click a button to fill my information into any job application form.
* **Custom Fields:** As a user, I can add custom fields to my profile (e.g., "Notice Period," "Desired Work Arrangement") and have them filled in.
* **Anonymized Mapping:** As a user, I want the extension to intelligently map fields without sending my personal data to a third-party LLM.
* **Multi-Page Flow:** As a user applying through a multi-page portal like Workday, I want the extension to know I'm on the next page and offer to continue filling.
* **AI Salary Suggestion (Post-MVP):** As a user, I want the extension to suggest a competitive salary for the role based on market data, so I can negotiate more effectively.

---

### ## 4. Functional Requirements

#### #### 4.1 Profile Management
* Store profile data in `chrome.storage.local`, encrypted at rest.
* Support a **flexible key-value structure** for the profile to allow user-defined custom fields.
* Provide a UI to add, edit, and delete profile fields.
* Securely store an optional, user-provided API key for a cloud LLM provider (OpenAI, Anthropic, etc.).

#### #### 4.2 Mapping & Filling Engine
The engine will use a three-tiered waterfall logic for mapping fields:
1.  **Vendor Adapters:** Use high-confidence, pre-defined CSS selectors for major ATS platforms (Workday, Greenhouse, Lever).
2.  **Heuristic Mapping:** For non-adapter sites, map fields using `autocomplete`, `name`, `id`, and other attributes with strong correlations.
3.  **LLM Fallback:** For any remaining unmapped fields, use the LLM mapping service.

#### #### 4.3 LLM Mapping Service
* The service sends an **anonymized payload** to the LLM containing only the form's field labels/attributes and the profile's field keys (no user values).
* The prompt instructs the model to return a JSON object mapping the form schema to the profile schema.
* Supports a local LLM by default (Ollama, etc.) or a user-configured cloud endpoint using their API key.

#### #### 4.4 Preview & Confirmation
* The preview modal must clearly indicate the **source** for each filled value (e.g., "From Profile," "✨ AI Suggestion").
* For AI suggestions, the UI must provide a brief rationale (e.g., "Based on market data for this role").
* Users must be able to accept/reject individual suggestions before filling.

#### #### 4.5 Multi-Page Flow Management
* The extension will implement a **flow orchestrator** to detect and manage state within a single job application session.
* After the initial fill, it will monitor navigation and proactively (but unobtrusively) offer to fill subsequent pages in the same application.

#### #### 4.6 AI Augmentation Engine (Post-MVP)
* A secure backend service will integrate with third-party data providers (e.g., compensation data APIs) to fetch market data.
* The initial implementation will focus on providing **strategic salary suggestions** based on the job title, location, and company.

---

### ## 5. High-Level Architecture & Data Flow

**Component Diagram:**
`[User]` → `[Extension UI]` → `[Content Script: Extractor]`
     → `[Background Script: Mapping Engine]`
        1. → `[Vendor Adapter? (Yes/No)]`
        2. → `[Heuristic Mapper? (Yes/No)]`
        3. → `[LLM Client (Anonymized Payload)]` → `[Local/Cloud LLM]`
     → `[Content Script: Preview Modal]`
     → `[DOM Filler]`

**Post-MVP Flow:**
`[Content Script]` → `[Background Script]` → `[**Backend Augmentation API**]` → `[External Data APIs]` → `[Return Suggestion]` → `[Preview Modal]`

---

### ## 6. Risks & Mitigations

* **Risk:** Incorrect mapping of sensitive fields.
    * **Mitigation:** Preview modal with explicit user confirmation remains the primary safeguard.
* **Risk:** Inaccurate AI suggestions (e.g., bad salary data) erode user trust.
    * **Mitigation:** Clearly cite data sources in the UI and always allow the user to easily override any suggestion.
* **Risk:** Dependency on external data APIs for augmentation features.
    * **Mitigation:** Design the backend service with an abstraction layer to support multiple data providers and handle API failures gracefully.
* **Risk:** Brittle CSS selectors in vendor adapters breaking with site updates.
    * **Mitigation:** Implement a monitoring system to periodically check adapter health and rely on the Heuristic/LLM fallback when they fail.

---

### ## 7. Success Metrics

* Autofill success rate (Adapter + Heuristic) ≥ 95% for standard fields on top 5 ATS platforms.
* Latency for mapping and preview generation ≤ 2 seconds.
* **[v2.0 Metric]** Adoption rate of AI-suggested salaries > 30% among users who see the feature.
* **[v2.0 Metric]** Measurable increase in user retention after the launch of co-pilot features.
* Zero PII leaks without explicit user action.
