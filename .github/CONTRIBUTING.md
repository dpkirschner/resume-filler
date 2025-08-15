# Contributing to Job Application Co-Pilot

## Development Workflow

This project uses GitHub Actions for continuous integration and automated quality checks. All code must pass these checks before merging.

## Required Status Checks

The following checks must pass before any pull request can be merged:

### 🧪 Test & Quality Checks
- **Type Checking**: TypeScript compilation without errors
- **Linting**: ESLint rules compliance with zero warnings
- **Unit Tests**: All tests must pass with coverage reporting
- **Node.js Compatibility**: Tests run on Node.js 18.x and 20.x

### 🔒 Security Checks
- **Security Audit**: npm audit for known vulnerabilities
- **Dependency Review**: Automated review of new dependencies

### 🏗️ Build Verification
- **Extension Build**: Chrome extension builds successfully
- **Manifest Validation**: Chrome extension manifest is valid

## Setting Up Branch Protection

To enforce these quality checks, configure branch protection rules:

### 1. Navigate to Repository Settings
- Go to your repository on GitHub
- Click "Settings" tab
- Select "Branches" from the left sidebar

### 2. Add Branch Protection Rule
- Click "Add rule"
- Branch name pattern: `main`
- Configure the following settings:

#### Required Status Checks
✅ **Require status checks to pass before merging**
- ✅ Require branches to be up to date before merging
- Select these required checks:
  - `Test & Quality Checks (18.x)`
  - `Test & Quality Checks (20.x)` 
  - `Build Extension`
  - `Security Audit`
  - `Quality Gate`
  - `Dependency Review`

#### Additional Protections
- ✅ **Require pull request reviews before merging**
  - Required number of reviewers: 1
  - ✅ Dismiss stale reviews when new commits are pushed
- ✅ **Require conversation resolution before merging**
- ✅ **Restrict pushes that create files**
- ✅ **Do not allow bypassing the above settings**

## Local Development

### Prerequisites
- Node.js 18.x or 20.x
- npm (comes with Node.js)

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd resume-filler

# Install dependencies
npm install

# Run development server
npm run dev
```

### Quality Checks (Run Before Pushing)
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Build extension
npm run build
```

### Running Tests
```bash
# Run all tests once
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode (no watch, coverage, exit on completion)
npm run test:ci
```

## Code Standards

### TypeScript
- All code must be written in TypeScript
- No `any` types allowed (use proper typing)
- Strict TypeScript configuration is enforced

### ESLint Rules
- Zero warnings allowed
- Maximum 0 warnings configuration
- React hooks rules enforced
- TypeScript-specific rules applied

### Testing Requirements
- All new features must include unit tests
- Test coverage should maintain current levels
- Tests must pass in both Node.js 18.x and 20.x

### Security
- No secrets or API keys in code
- All user data must be encrypted at rest
- Follow privacy-first principles

## Chrome Extension Specific Guidelines

### Manifest V3
- Use Manifest V3 format only
- Service workers instead of background pages
- Declarative content scripts

### Storage
- Use `chrome.storage.local` for all data persistence
- Encrypt sensitive data before storage
- Never store unencrypted PII

### Permissions
- Request minimal permissions required
- Document all permission uses
- Respect user privacy choices

## Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Develop and Test**
   - Write code following standards above
   - Add/update tests as needed
   - Run local quality checks

3. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   - Create pull request on GitHub
   - Fill out PR template completely
   - Wait for CI checks to pass

4. **Code Review**
   - Address review feedback
   - Ensure all conversations are resolved
   - Re-run CI checks if needed

5. **Merge**
   - Once approved and all checks pass
   - Use "Squash and merge" for clean history

## Release Process

Releases are automated when version tags are pushed:

```bash
# Update version in package.json
npm version patch|minor|major

# Push tags to trigger release
git push origin main --tags
```

This will:
- Run all quality checks
- Build the extension
- Create a GitHub release
- Upload extension zip file

## Getting Help

- Check existing issues and discussions
- Review the codebase documentation in `/docs/`
- Follow the coding patterns established in the codebase
- Ask questions in pull request comments