# GitHub Actions Workflows

This directory contains the CI/CD workflows for the Job Application Co-Pilot project.

## Workflow Status

[![CI](https://github.com/[USERNAME]/[REPOSITORY]/workflows/CI/badge.svg)](https://github.com/[USERNAME]/[REPOSITORY]/actions/workflows/ci.yml)
[![PR Quality Checks](https://github.com/[USERNAME]/[REPOSITORY]/workflows/PR%20Quality%20Checks/badge.svg)](https://github.com/[USERNAME]/[REPOSITORY]/actions/workflows/pr-checks.yml)

## Available Workflows

### 1. `ci.yml` - Main CI Pipeline
**Triggers:** Push to `main`/`develop`, Pull Requests
- ✅ Runs tests on Node.js 18.x and 20.x
- ✅ Type checking with TypeScript
- ✅ Code linting with ESLint
- ✅ Test coverage reporting
- ✅ Security audit
- ✅ Chrome extension build verification

### 2. `pr-checks.yml` - Pull Request Quality Gate
**Triggers:** Pull Request opened/updated
- ✅ Enhanced quality checks specific to PRs
- ✅ Test coverage threshold validation
- ✅ Chrome extension manifest validation
- ✅ Bundle size reporting
- ✅ Dependency review for security

### 3. `release.yml` - Automated Releases
**Triggers:** Version tags (`v*`)
- ✅ Full quality check pipeline
- ✅ Production build
- ✅ Automated GitHub release creation
- ✅ Extension package (.zip) upload

## Setting Up Branch Protection

To enforce quality checks on your repository:

1. **Go to Repository Settings** → **Branches**
2. **Add protection rule for `main` branch**
3. **Enable these required status checks:**
   - `Test & Quality Checks (18.x)`
   - `Test & Quality Checks (20.x)`
   - `Build Extension`
   - `Security Audit`
   - `Quality Gate`
   - `Dependency Review`

## Workflow Secrets

No additional secrets are required - these workflows use the default `GITHUB_TOKEN` provided by GitHub Actions.

## Badge URLs

Replace `[USERNAME]` and `[REPOSITORY]` with your actual GitHub username and repository name:

```markdown
[![CI](https://github.com/[USERNAME]/[REPOSITORY]/workflows/CI/badge.svg)](https://github.com/[USERNAME]/[REPOSITORY]/actions/workflows/ci.yml)
[![PR Checks](https://github.com/[USERNAME]/[REPOSITORY]/workflows/PR%20Quality%20Checks/badge.svg)](https://github.com/[USERNAME]/[REPOSITORY]/actions/workflows/pr-checks.yml)
```