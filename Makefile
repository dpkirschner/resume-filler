# Job Application Co-Pilot - Production Makefile v2.0
# Upgraded with smarter dependencies and DRY principles.

# =============================================================================
# Configuration & Variables
# =============================================================================
.DEFAULT_GOAL := help
.PHONY: help install clean dev build test test-watch test-coverage lint typecheck fix audit ci preview validate-manifest format status

# --- Tools ---
NPM := npm
NODE := node

# --- Directories & Files ---
SRC_DIR := src
BUILD_DIR := dist
COVERAGE_DIR := coverage
PACKAGE_FILES := package.json package-lock.json
MANIFEST_FILE := public/manifest.json

# --- Find all source files for smart dependency tracking ---
SRC_FILES := $(shell find $(SRC_DIR) -type f -name '*.ts' -o -name '*.tsx')

# --- Colors for readable output ---
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
PURPLE := \033[0;35m
CYAN := \033[0;36m
RED := \033[0;31m
NC := \033[0m # No Color

# --- Helper for running commands with consistent output ---
# Usage: $(call RUN_CHECK, <command>, <description>)
RUN_CHECK = @$(1) && echo "$(GREEN)✓ $(2) passed$(NC)" || (echo "$(RED)✗ $(2) failed$(NC)" && exit 1)


# =============================================================================
# Help & Information (Self-Documenting)
# =============================================================================

help: ## Show this help message
	@echo "$(CYAN)Job Application Co-Pilot - Development Commands$(NC)"
	@echo "=================================================="
	@echo ""
	@echo "$(GREEN)Usage: make <command>$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf ""} /^[a-zA-Z_-]+:.*?##/ { printf "  $(CYAN)%-18s$(NC) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)


# =============================================================================
# Core Environment Commands
# =============================================================================

# The node_modules directory is a target that depends on your package files.
# If package.json or package-lock.json changes, `make` will know node_modules is out of date.
node_modules: $(PACKAGE_FILES)
	@echo "$(BLUE)Dependencies are out of date. Running npm install...$(NC)"
	@$(NPM) install
	@touch node_modules

install: node_modules ## Install or update project dependencies

clean: ## Clean build artifacts and temporary files
	@echo "$(YELLOW)Cleaning build artifacts and cache...$(NC)"
	@rm -rf $(BUILD_DIR) $(COVERAGE_DIR) node_modules/.cache .eslintcache
	@echo "$(GREEN)✓ Clean completed$(NC)"


# =============================================================================
# Development & Build Commands
# =============================================================================

dev: node_modules ## Start development server with hot reload
	@echo "$(BLUE)Starting development server...$(NC)"
	@$(NPM) run dev

# This is a "sentinel" file. Its rule ensures the build command only runs
# if source files or dependencies have changed.
$(BUILD_DIR)/.build_complete: $(SRC_FILES) node_modules
	@echo "$(BLUE)Source files changed. Building Chrome extension...$(NC)"
	@$(NPM) run build
	@touch $@

build: $(BUILD_DIR)/.build_complete ## Build the extension (only if source files changed)
	@echo "$(GREEN)✓ Build is up to date in $(BUILD_DIR)/$(NC)"

preview: build ## Build and show instructions to preview the extension
	@echo "$(CYAN)To load in Chrome:$(NC)"
	@echo "  1. Open Chrome and go to chrome://extensions/"
	@echo "  2. Enable 'Developer mode'"
	@echo "  3. Click 'Load unpacked' and select the '$(BUILD_DIR)' directory"


# =============================================================================
# Code Quality & Testing
# =============================================================================

lint: node_modules ## Run ESLint checks on the project
	@echo "$(BLUE)Running ESLint...$(NC)"
	$(call RUN_CHECK, $(NPM) run lint, ESLint)

typecheck: node_modules ## Run TypeScript type checking
	@echo "$(BLUE)Running TypeScript type check...$(NC)"
	$(call RUN_CHECK, $(NPM) run typecheck, TypeScript)

fix: node_modules ## Auto-fix linting issues
	@echo "$(PURPLE)🔧 Auto-fixing linting issues...$(NC)"
	@$(NPM) run lint -- --fix
	@echo "$(GREEN)✓ Lint auto-fix complete$(NC)"

test: node_modules ## Run the full test suite
	@echo "$(BLUE)Running test suite...$(NC)"
	$(call RUN_CHECK, $(NPM) test, Tests)

test-watch: node_modules ## Run tests in watch mode
	@echo "$(BLUE)Starting tests in watch mode...$(NC)"
	@$(NPM) run test:watch

test-coverage: node_modules ## Generate test coverage report
	@echo "$(BLUE)Generating test coverage report...$(NC)"
	@$(NPM) run test:coverage
	@echo "$(GREEN)✓ Coverage report generated in $(COVERAGE_DIR)/$(NC)"


# =============================================================================
# CI/CD & Security
# =============================================================================

audit: node_modules ## Run security audit on dependencies
	@echo "$(YELLOW)Running security audit...$(NC)"
	@$(NPM) audit --audit-level=moderate

validate-manifest: ## Validate the Chrome extension manifest.json
	@echo "$(BLUE)Validating $(MANIFEST_FILE)...$(NC)"
	@if [ -f "$(MANIFEST_FILE)" ]; then \
		$(NODE) -e "JSON.parse(require('fs').readFileSync('$(MANIFEST_FILE)', 'utf8'))" && \
		echo "$(GREEN)✓ Manifest is valid JSON$(NC)"; \
	else \
		echo "$(RED)✗ $(MANIFEST_FILE) not found$(NC)" && exit 1; \
	fi

ci: install lint typecheck test audit validate-manifest build ## Run the full CI pipeline
	@echo "$(PURPLE)🚀 CI pipeline completed successfully!$(NC)"