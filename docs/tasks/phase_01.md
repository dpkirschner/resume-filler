
The tasks are broken down into three logical epics. A developer can focus on one epic at a time to build the MVP incrementally.

---

### ## Epic 1: Foundation – Profile & Settings

**Goal:** Build the core user-facing UI for managing the profile and configuring the extension.

* #### **Task 1: Build the Profile Management UI**
    * Create the main extension popup UI using a simple framework (e.g., React, Preact, or vanilla JS).
    * Build a form that allows a user to **add**, **edit**, and **delete** custom fields (label and value).
    * Display all profile fields in a clear list.
    * Include an input field for an optional encryption passphrase.

* #### **Task 2: Implement Encrypted Storage**
    * Create a dedicated module (`storage.js`) to handle all interactions with **`chrome.storage.local`**.
    * Integrate a standard encryption library (e.g., `crypto-js`).
    * Write functions to `saveProfile(profileObject, passphrase)` which encrypts the data, and `loadProfile(passphrase)` which decrypts it.

* #### **Task 3: Create the Settings & Onboarding UI**
    * Build a separate "Settings" page.
    * Add a section to detect and display the status of a local **Ollama** instance (e.g., by fetching `http://localhost:11434`).
    * Include a form where a user can select a cloud provider (e.g., "OpenAI") and securely input/save an API key using the `storage.js` module.

---

### ## Epic 2: Core Logic – Data Extraction & Mapping

**Goal:** Implement the "brains" of the extension that can read a web page and decide how to fill it.

* #### **Task 4: Build the Form Schema Extractor**
    * Create a **content script** (`extractor.js`) that activates on web pages.
    * Write a function to scan the page's DOM for `<input>`, `<select>`, and `<textarea>` elements.
    * For each element found, extract its metadata: associated `<label>` text, `name`, `id`, `placeholder`, and `options` (for selects).
    * Package this information into the `formSchema` JSON array we designed.

* #### **Task 5: Implement the Heuristic & Vendor Mappers**
    * In the **background script**, create the first two tiers of the mapping engine.
    * **Tier 1 (Vendor):** Create a simple module that maps fields for Greenhouse using hardcoded CSS selectors.
    * **Tier 2 (Heuristic):** Write a function that compares the extracted `label`, `name`, and `id` from the `formSchema` against the user's profile keys for simple, direct matches.

* #### **Task 6: Implement the LLM Mapper Fallback**
    * Create a module (`llmClient.js`) responsible for making API calls.
    * Implement the function to call the local **Ollama** API.
    * Ensure the payload sent to the API is the **anonymized JSON payload**, containing only schemas and no user values.
    * Write the logic in the main mapping engine to use this LLM client only for fields that were not matched by Tiers 1 or 2.

---

### ## Epic 3: User Interaction – Preview & Fill

**Goal:** Connect the logic to the user by showing them the proposed changes and executing the fill.

* #### **Task 7: Build the Preview Modal UI**
    * Create the UI component for the confirmation modal that will be injected into web pages.
    * The modal should be able to dynamically display a table of data it receives (`field label`, `value to be filled`).
    * Include "Fill Form" and "Cancel" buttons.

* #### **Task 8: Implement the DOM Filler & Event Dispatcher**
    * Create a `filler.js` module in the **content script**.
    * Write a function that receives the confirmed mappings and a list of CSS selectors.
    * This function must locate the elements on the page and set their `.value`.
    * **Crucially**, after setting the value, it must programmatically dispatch `input`, `change`, and `blur` events on the element to ensure the page's framework (like React) recognizes the change.

* #### **Task 9: Implement User Notifications**
    * Create a simple "toast" notification component.
    * Write a function in the content script that can be called to show this toast with a message (e.g., "Successfully filled 15 fields," or "Mapping failed").

This breakdown provides a clear path. The developer can start with Epic 1 to get the basic extension shell working, then move to Epic 2 for the core logic, and finish with Epic 3 to create the final user experience.
