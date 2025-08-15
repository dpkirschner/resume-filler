

These tasks are designed to be completed sequentially, building the "memory" of the extension so it can handle multi-page forms gracefully.

---

### ## Epic 1: The "Brain" – Flow Detection & State Management

**Goal:** Implement the background logic that allows the extension to recognize and track a user's progress through a single job application across multiple pages.

* #### **Task 1: Define the Flow Initiation Logic**
    * In the **background script**, establish the rules for what starts a "flow." A good starting point is: a new flow is created the first time a user successfully triggers and confirms an autofill on a supported ATS domain (e.g., `workday.com`, `greenhouse.io`).
    * Generate a unique `flowId` for this new session.

* #### **Task 2: Build the Flow Management Service**
    * Create a new module (`flowManager.js`) in the **background script** to manage all flow-related state.
    * Implement functions to `create`, `get`, `update`, and `end` a flow using the `activeFlows` object in **`chrome.storage.local`**.
    * The `update` function will be essential for saving cached mappings later.

* #### **Task 3: Implement a Tab Navigation Listener**
    * In the **background script**, use the **`chrome.tabs.onUpdated`** listener to monitor page navigations.
    * When a tab finishes loading, check if its URL pattern matches a domain associated with an active flow.
    * If it matches, send a message to the **content script** in that tab, informing it that it's part of an active flow (e.g., `message: { type: 'FLOW_DETECTED', flowId: '...' }`).

---

### ## Epic 2: The "Experience" – Caching & Proactive UI

**Goal:** Use the flow management system to create a fast and intuitive user experience on subsequent pages of an application.

* #### **Task 4: Cache Confirmed Mappings**
    * Modify the logic from Phase 1. After a user clicks "Fill Form" in the preview modal, the **content script** should send the successfully applied mappings back to the **background script**.
    * The background script will then use the `flowManager.js` to save these mappings into the `cachedMappings` array for the current active flow.

* #### **Task 5: Implement Proactive Mapping**
    * Update the **content script**'s initialization logic. When it loads, it should listen for the `'FLOW_DETECTED'` message from the background script.
    * Upon receiving this message, it should automatically run the schema extractor and send the new page's schema to the background script to begin the mapping process, without waiting for the user to click the extension icon.

* #### **Task 6: Build and Trigger the "Continue Filling?" UI**
    * Create a new, non-intrusive "toast" notification UI component. This component should have buttons like "Continue" and "Dismiss."
    * When the proactive mapping in Task 5 is complete, instead of showing the full preview modal immediately, show this gentle toast notification first.
    * If the user clicks "Continue," then display the full preview modal with the proposed values for the new page.

By the end of this phase, the extension will feel much smarter, guiding the user through an entire application instead of just acting on a single page at a time.
