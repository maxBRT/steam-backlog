# CI Pipeline Setup

This document describes the CI pipeline implementation and how to configure GitHub branch protection to block merges on failure.

## Pipeline Overview

The CI pipeline runs automatically on every pull request and push to `main` and `develop` branches. It consists of the following jobs:

### Jobs

1. **lint-php** - PHP code style checking using Laravel Pint
2. **lint-frontend** - Frontend linting using ESLint and Prettier
3. **type-analysis** - PHP static analysis using PHPStan
4. **tests** - Full test suite on PHP 8.3 and 8.4
5. **build** - Frontend asset compilation

All jobs run in parallel for faster feedback. The pipeline will fail if any job fails.

## Configuration

### Workflow File

Location: `.github/workflows/ci.yml`

The workflow is triggered on:
- Pull requests to `main` and `develop`
- Direct pushes to `main` and `develop`

### Caching

The pipeline uses GitHub Actions cache to speed up builds:
- Composer dependencies (per PHP version)
- Node modules
- PHPStan result cache

## Branch Protection Rules

To block merges when CI fails, configure branch protection rules in GitHub:

### Setup Instructions

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Branches**
3. Click **Add branch protection rule**
4. Configure the following:

#### Branch name pattern
```
main
```

#### Settings to enable

- ✅ **Require a pull request before merging**
  - Optional: Require approvals (recommended: 1)
  - Optional: Dismiss stale pull request approvals when new commits are pushed

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Required status checks** (select all):
    - `Lint PHP`
    - `Lint Frontend`
    - `PHP Type Analysis`
    - `Tests (PHP 8.3)`
    - `Tests (PHP 8.4)`
    - `Build Assets`

- ✅ **Require conversation resolution before merging** (optional but recommended)

- ✅ **Do not allow bypassing the above settings** (recommended)

#### Additional recommended settings

- ✅ **Require linear history** (prevents merge commits, enforces rebase)
- ✅ **Include administrators** (applies rules to repo admins too)

### Repeat for develop branch

Create another branch protection rule with the same settings for the `develop` branch.

## Local Development

### Running CI Checks Locally

Before pushing, you can run all CI checks locally:

```bash
# PHP code style
composer lint:check

# PHP static analysis
composer types:check

# Frontend checks
npm run format:check
npm run lint:check
npm run types:check

# Build assets
npm run build

# Run tests
php artisan test

# Or run all checks at once
composer ci:check
```

### Fixing Issues

```bash
# Auto-fix PHP code style
composer lint

# Auto-fix frontend linting
npm run lint

# Auto-fix frontend formatting
npm run format
```

## Monitoring

### GitHub Actions Dashboard

View CI runs at: `https://github.com/[owner]/[repo]/actions`

### Status Badges

Add to README.md:

```markdown
![CI Pipeline](https://github.com/[owner]/[repo]/actions/workflows/ci.yml/badge.svg)
```

## Troubleshooting

### Common Issues

#### Cache corruption
If you see unexpected failures, clear the Actions cache:
- Go to **Settings** > **Actions** > **Caches**
- Delete all caches for the branch

#### Dependency version conflicts
- Ensure `composer.lock` and `package-lock.json` are committed
- Run `composer install` and `npm ci` locally to verify

#### Failed status checks
- Check the Actions tab for detailed logs
- Each job runs independently and shows specific error messages

## Performance

Current CI pipeline duration (approximate):
- **lint-php**: ~30 seconds
- **lint-frontend**: ~45 seconds
- **type-analysis**: ~40 seconds
- **tests**: ~2 minutes (per PHP version)
- **build**: ~1 minute

Total parallel execution time: ~2-3 minutes

## Future Improvements

Potential enhancements:
- Add code coverage reporting
- Add performance benchmarking
- Add security scanning (Dependabot is already configured)
- Add E2E tests with Playwright or Cypress
- Add deployment pipeline for staging/production
