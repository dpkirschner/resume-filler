# GEMINI.md

## Project Overview

This project, "Job Application Co-Pilot," is a privacy-first Chrome extension designed to streamline the job application process. It functions as a "co-pilot" by not only autofilling application forms with user data but also providing strategic, AI-augmented suggestions for key fields like salary.

The extension is built using React and TypeScript. It operates on a local-first principle, storing the user's profile data encrypted in `chrome.storage.local`. It features a hybrid, three-tiered mapping engine to identify and fill form fields:

1.  **Vendor Adapters:** High-confidence, pre-defined CSS selectors for major Applicant Tracking Systems (ATS) like Workday, Greenhouse, and Lever.
2.  **Heuristic Mapping:** A semantic matching model that uses client-side embeddings to intelligently map fields based on their labels and attributes, even with synonyms (e.g., "Given Name" vs. "First Name").
3.  **LLM Fallback:** As a final step, it uses a Large Language Model (local via Ollama or a user-configured cloud provider) to map any remaining fields. Crucially, all LLM calls are **anonymized**, sending only the form's structure and the user profile's keys, never the user's actual data.

A key feature is the post-MVP "AI Augmentation Engine," a backend service that provides data-driven suggestions for fields like salary, leveraging external market data to give users a competitive edge.

The project is architected to be modular, with clear separation between the UI (React components), core logic (background scripts for mapping and state management), and content scripts (for DOM interaction).

## Building and Running

The project uses `npm` for package management and `vite` for the development server and build process.

*   **Install Dependencies:**
    ```bash
    npm install
    ```

*   **Run the Development Server:**
    ```bash
    npm run dev
    ```

*   **Build for Production:**
    ```bash
    npm run build
    ```

*   **Run Tests:**
    ```bash
    npm test
    ```

*   **Run Tests in Watch Mode:**
    ```bash
    npm run test:watch
    ```

*   **Run Tests with Coverage:**
    ```bash
    npm run test:coverage
    ```

*   **Run Linting:**
    ```bash
    npm run lint
    ```

*   **Run Type Checking:**
    ```bash
    npm run typecheck
    ```

## Development Conventions

*   **Code Style:** The project uses ESLint for code linting, with configurations defined in `eslint.config.js`. The style is consistent with modern React and TypeScript best practices.
*   **Testing:** The project uses Jest for unit and integration testing, with configuration in `jest.config.js`. Tests are located in the `tests/` directory and are organized by type (unit, integration, e2e). The project also uses Playwright for end-to-end testing and adapter health checks.
*   **Commits and Pull Requests:** The `.github` directory contains templates for pull requests and contributing guidelines, suggesting a structured approach to development and contributions.
*   **Modularity:** The codebase is organized into modules with specific responsibilities, such as `storage`, `mapping`, `llm`, and UI components. This promotes separation of concerns and maintainability.
*   **Privacy-First:** A core convention is the emphasis on user privacy. All sensitive data is encrypted at rest, and any data sent to external services (like LLMs) is anonymized.
