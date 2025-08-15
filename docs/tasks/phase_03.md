

This phase is focused on making the mapping engine smarter and more robust by introducing automated testing and a data-driven feedback loop.

---

### ## Epic 1: Building the Feedback Loop

**Goal:** Create the infrastructure to collect anonymous user feedback, which will be the foundation for making the mapping engine self-improving.

* #### **Task 1: Add "Correct Mapping" UI to the Preview Modal**
    * In the preview modal's UI, add a "Change" or "Edit" button next to each mapped field.
    * When clicked, this button should reveal a dropdown populated with all other available keys from the user's profile.
    * Selecting a new key from the dropdown should update the proposed value in the preview modal.

* #### **Task 2: Capture and Send Anonymous Corrections**
    * When a user makes a correction and then successfully submits the form, create an anonymous feedback object.
    * This object should contain the original form field's context (label, attributes) and the `profileKey` the user selected as the correct mapping (e.g., `{ form_context: { label: 'Your Full Name' }, corrected_key: 'Full Name' }`).
    * Implement an "opt-in" check before sending this data.

* #### **Task 3: Create a Simple Backend Endpoint for Feedback**
    * Set up a basic, secure backend service (e.g., using a serverless function on Vercel, Netlify, or AWS Lambda).
    * This endpoint will have one job: receive the anonymous feedback JSON from the extension and save it to a database (like Supabase, Firestore, or a simple log file).

---

### ## Epic 2: Creating a Smarter Heuristic Engine

**Goal:** Upgrade the simple Tier 2 heuristic mapper to use modern semantic matching, making it far more accurate with synonyms and related concepts.

* #### **Task 4: Integrate a Client-Side Embedding Library**
    * Research and install a lightweight library for running text embedding models in the browser, such as **`transformers.js`**.
    * Choose a small, efficient model suitable for this task (e.g., `Xenova/all-MiniLM-L6-v2`).

* #### **Task 5: Implement Semantic Similarity Logic**
    * Create a new `SemanticMatcher.js` module.
    * Write a function that takes a single form field's label text (e.g., "Given Name") and the list of all profile keys (e.g., ["First Name", "Last Name"]).
    * Inside this function, use the library from Task 4 to convert all input strings into vector embeddings.
    * Calculate the **cosine similarity** between the form field's embedding and each profile key's embedding.
    * The function should return the profile key with the highest similarity score.

* #### **Task 6: Upgrade the Tier 2 Heuristic Mapper**
    * Go back to the `heuristicMapper.js` module from Phase 1.
    * Replace the old logic (which likely used simple string matching) with a call to the new `SemanticMatcher.js`.
    * The heuristic tier is now significantly more intelligent and less reliant on exact keyword matches.

---

### ## Epic 3: Hardening the System

**Goal:** Improve the reliability of the fastest mapping tier (Vendor Adapters) and optimize the slowest tier (LLM Fallback).

* #### **Task 7: Set Up an Automated Testing Framework**
    * Add a browser automation library like **Playwright** to the project's development dependencies.
    * Save static HTML copies of key job application pages from Workday, Greenhouse, and Lever into a `__tests__/mocks` directory.

* #### **Task 8: Write Adapter Health Check Tests**
    * Using **Playwright**, write a test script for each vendor adapter.
    * The script should launch a browser, load the extension, navigate to the local mock HTML file, trigger a schema extraction, and confirm that the vendor-specific adapter correctly maps the expected fields.

* #### **Task 9: Integrate Tests into CI/CD**
    * Create a **GitHub Actions** workflow file (`.github/workflows/tests.yml`).
    * Configure the workflow to automatically run the Playwright test suite on every pull request to the `main` branch. This will prevent broken adapters from being deployed.

* #### **Task 10: Implement Smart Token Budgeting**
    * In the `llmClient.js` module, before making an API call, implement a function that estimates the token count of the anonymized payload.
    * If the count exceeds a predefined budget (e.g., 3000 tokens), call a `truncateSchema` function to intelligently shorten it by removing the least critical data, such as long lists of dropdown options or placeholder text.
