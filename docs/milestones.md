
### ## Phase 1 – Core Autofill MVP

**Goal:** Ship a privacy-first, reliable autofill system with a polished "out-of-the-box" experience.

**Milestones:**
* **Profile Management Module:**
    * Implement flexible, encrypted `chrome.storage.local` profile.
    * Support custom fields (schema-free key-value).
    * UI for CRUD operations on profile fields.
    * Optional local encryption passphrase.
* **Onboarding & LLM Setup UI:** ✨
    * Create a first-run UI to guide users.
    * Handle the "no local LLM detected" state gracefully.
    * Provide an interface for users to securely add a cloud LLM API key.
* **Form Schema Extractor:**
    * Content script to scan DOM for form controls with metadata.
    * Generate stable CSS selectors with an XPath fallback.
* **Hybrid Mapping Engine:**
    * Tier 1: Vendor Adapters for Workday, Greenhouse, Lever.
    * Tier 2: Heuristic mapper using attribute weighting.
    * Tier 3: LLM Fallback (local Ollama by default or user-configured cloud endpoint).
    * Ensure all LLM payloads are anonymized (schema keys only).
* **Preview & Confirmation Modal:**
    * Display a table of fields to be filled with their values and sources.
    * Allow users to accept/reject changes per field before execution.
* **Filler Execution & Error Handling:**
    * Perform DOM manipulation and dispatch correct events (`input`, `change`, `blur`).
    * Implement a **user-facing notification system** for success, partial success, and failure states. ✨
    * Log detailed info for debugging purposes.

**Dependencies:** Chrome MV3 API usage patterns; local encryption library; local LLM integration.
**Success Exit Criteria:** Autofill success ≥ 90% on top 3 ATS with no PII leakage; users have a clear path forward with or without a pre-configured local LLM.

---

### ## Phase 2 – Multi-Page Flow Management

**Goal:** Maintain fill context across paginated ATS applications for a seamless user experience.

**Milestones:**
* **Flow Orchestrator:**
    * Detect same-application navigation using URL patterns and DOM markers.
    * Define a data model to manage distinct application "sessions," even across multiple tabs.
    * Persist extracted schema and mappings for the duration of a flow.
* **Stateful Mapping Reuse:**
    * Cache confirmed mappings to reuse on subsequent pages within the same flow.
    * Automatically propose the next fill action upon page load.
* **UI Enhancements:**
    * Implement a non-intrusive toast notification for "Continue Filling?" actions.

**Dependencies:** Phase 1 mapping engine; robust schema diffing between pages.
**Success Exit Criteria:** Seamless multi-page fill on Workday and Lever portals without remapping delay or user friction.

---

### ## Phase 3 – Mapping Engine Optimization

**Goal:** Improve speed and accuracy, reduce reliance on the LLM, and build a self-improving system.

**Milestones:**
* **Privacy-Preserving User Feedback Loop:** ✨
    * Implement an opt-in feature in the preview modal for users to submit anonymous mapping corrections.
    * Establish a secure pipeline to collect this anonymized data for model tuning.
* **Heuristic Tuning:**
    * Use feedback data to tune the attribute scoring model.
    * Explore embedding-based semantic matching for better synonym recognition (e.g., "Given Name" vs. "First Name").
* **Adapter Health Checks:**
    * Create automated tests using synthetic ATS mocks to validate adapter selectors.
    * Alert on selector breakage and ensure graceful fallback to the heuristic tier.
* **LLM Cost & Latency Reduction:**
    * Enforce a token-budget and smart schema truncation strategy.
    * Investigate using a smaller, fine-tuned model (trained on feedback data) for faster, cheaper fallbacks.

**Dependencies:** Phase 1 mapping/LLM client; a data store for anonymized feedback.
**Success Exit Criteria:** ≥ 95% autofill success without LLM on top 5 ATS; LLM fallback is used for < 10% of fields.

---

### ## Phase 4 – Post-MVP AI Augmentation Engine

**Goal:** Deliver AI-driven strategic suggestions for key fields to provide a competitive advantage to users.

**Milestones:**
* **Backend Augmentation Service:**
    * Develop a secure microservice (Node/Go) with authentication.
    * Build an abstract data provider layer to integrate with multiple sources (e.g., compensation data APIs).
    * Implement robust rate limiting and caching.
* **Extension ↔ Backend API:**
    * Secure HTTPS calls from the extension's background script to the backend.
    * Send a minimal, anonymized job-related payload (title, location, company).
* **Suggestion Presentation:**
    * Update the UI to tag AI-suggested fields with a ✨ icon and a clear rationale.
    * Ensure users can easily override or reject any suggestion.
* **Analyze and Mitigate Potential Data Bias:** ✨
    * Audit external data sources for potential biases.
    * Design the UI and suggestion logic to be transparent and avoid presenting biased information as fact.
* **Telemetry (Opt-in):**
    * Track the acceptance rate of suggestions to measure feature value.

**Dependencies:** MVP backend infrastructure; external API agreements/keys.
**Success Exit Criteria:** > 30% adoption rate of salary suggestions with positive user feedback and clear data sourcing.

---

### ## Phase 5 – Hardening & Scale

**Goal:** Improve maintainability, security, and cross-browser reach for long-term growth.

**Milestones:**
* **Full Security Audit:**
    * Commission an end-to-end review of the encryption at rest, anonymization pipeline, and backend service.
    * Conduct threat modeling for extension injection and cross-site scripting vulnerabilities.
* **User Data Management Controls:** ✨
    * Implement a **"Download My Profile"** feature for data portability.
    * Implement a one-click **"Delete All My Data"** button within the extension.
* **Automated Cross-Browser Testing:**
    * Build a test suite using Playwright or Puppeteer for all major Chromium-based browsers.
* **Continuous Adapter Monitoring:**
    * Set up a GitHub Actions CI pipeline to run the adapter regression suite nightly against live or cached sites.
