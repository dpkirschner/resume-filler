# Job Application Co-Pilot: Consolidated Data Models

This file provides a complete set of example JSON structures for the core data models used in the extension.

---

### ## 1. `userProfile`

This is the decrypted representation of the user's complete profile, which is stored as a single encrypted string in `chrome.storage.local`.

* **`label`**: The user-facing name for the field, used for both UI display and as the key for LLM mapping.
* **`value`**: The data to be filled. This field is flexible and can be a simple `string` for most types, or an `Array<Object>` for complex types like `"workExperience"`.
* **`type`**: A category for grouping fields (`personal`, `link`, `custom`, `eeo`, `workExperience`). This allows the UI and filler logic to handle them differently.

```json
[
  {
    "label": "First Name",
    "value": "Jane",
    "type": "personal",
    "isSensitive": false
  },
  {
    "label": "Last Name",
    "value": "Doe",
    "type": "personal",
    "isSensitive": false
  },
  {
    "label": "Email",
    "value": "jane.doe@example.com",
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
      },
      {
        "title": "Software Engineer",
        "company": "Stripe",
        "location": "San Francisco, CA",
        "startDate": "2019-06-01",
        "endDate": "2021-12-31",
        "description": "Developed payment processing APIs for merchant dashboards."
      }
    ]
  },
  {
    "label": "Race / Ethnicity",
    "value": "Decline to self-identify",
    "type": "eeo",
    "isSensitive": true
  }
]
````

-----

### \#\# 2. `userSettings`

This object, stored in `chrome.storage.local`, holds user-specific configurations.

  * **`llmProvider`**: Determines which LLM client to use (e.g., a local Ollama instance or a cloud provider).
  * **`apiKey`**: Stores the user's cloud API key. This value is always encrypted at rest.
  * **`enableTelemetry` / `enableFeedback`**: Boolean flags controlling the user's opt-in consent for sharing anonymous data.

<!-- end list -->

```json
{
  "llmProvider": "ollama",
  "apiKey": "enc_sk-...",
  "enableTelemetry": true,
  "enableFeedback": true
}
```

-----

### \#\# 3. `activeFlows`

This temporary object, stored in `chrome.storage.local`, manages the state for multi-page applications to ensure a smooth, continuous filling experience.

  * **`flowId` (key)**: A unique identifier for an application session, typically combining the domain and a timestamp.
  * **`cachedMappings`**: An array that stores successful mappings from previous pages in the flow, preventing the need for redundant LLM calls.

<!-- end list -->

```json
{
  "workday.com_1723671443000": {
    "domain": "workday.com",
    "lastActivity": "2025-08-14T21:37:23.000Z",
    "cachedMappings": [
      {
        "idx": 0,
        "profileKey": "First Name",
        "action": "setValue"
      }
    ]
  }
}
```

-----

### \#\# 4. `llmMappingPayload` (Anonymized)

This is the payload sent to the LLM. It is designed to be **completely anonymous** and contains no user PII.

  * **`formSchema`**: An array representing the structure and context of the fields found on the webpage. The `idx` provides a simple way to link responses back to fields.
  * **`profileSchema`**: An array of the `label` keys from the user's profile. This tells the LLM what data is available to be mapped.

<!-- end list -->

```json
{
  "formSchema": [
    {
      "idx": 0,
      "label": "Given Name",
      "attributes": {
        "name": "fname",
        "placeholder": "Your first name"
      },
      "options": null
    },
    {
      "idx": 1,
      "label": "Contact E-mail",
      "attributes": {
        "name": "email",
        "type": "email"
      },
      "options": null
    }
  ],
  "profileSchema": [
    "First Name",
    "Last Name",
    "Email",
    "Work Experience"
  ]
}
```

-----

### \#\# 5. `llmMappingResponse`

This is the JSON response received from the LLM, containing a precise set of instructions for the extension's filler logic.

  * **`mappings`**: An array of objects, where each object represents a successful field mapping.
  * **`idx`**: Links the mapping instruction back to the specific field in the `formSchema`.
  * **`profileKey`**: Specifies which piece of data from the user's profile should be used.
  * **`action`**: The DOM interaction to perform (e.g., `setValue`, `selectByText`).

<!-- end list -->

```json
{
  "mappings": [
    {
      "idx": 0,
      "profileKey": "First Name",
      "action": "setValue",
      "confidence": 0.98,
      "reasoning": "The label 'Given Name' is a common synonym for 'First Name'."
    },
    {
      "idx": 1,
      "profileKey": "Email",
      "action": "setValue",
      "confidence": 0.99,
      "reasoning": "The label 'Contact E-mail' and attribute type 'email' strongly indicate a mapping to the profile's 'Email' field."
    }
  ],
  "unmappedIndices": []
}
