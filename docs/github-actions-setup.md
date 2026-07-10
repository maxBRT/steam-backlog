# GitHub Actions Setup Guide

This document explains how to enable and configure GitHub Actions for the Steam Backlog repository.

## Initial Setup

### 1. Enable GitHub Actions (if not already enabled)

1. Go to **Settings** → **Actions** → **General**
2. Under "Actions permissions", select:
   - ✅ **Allow all actions and reusable workflows**
   
   Or more restrictively:
   - ✅ **Allow [organization] actions and reusable workflows**
   - Select: "Allow actions created by GitHub" and "Allow specified actions"

3. Under "Workflow permissions", configure:
   - ✅ **Read repository contents and packages permissions** (default)
   - ✅ **Allow GitHub Actions to create and approve pull requests** (optional)

4. Save changes

### 2. Approve First Workflow Run

When a new workflow is introduced or when a first-time contributor opens a PR:

1. GitHub will show a notice: **"Workflows awaiting approval"**
2. Click **"Approve and run"** to allow the workflow
3. Future runs will execute automatically

**Note**: This is a security feature to prevent malicious code execution in workflows.

### 3. Configure Required Status Checks

After the CI workflow runs successfully on at least one PR:

1. Go to **Settings** → **Branches**
2. Click **"Add branch protection rule"**
3. Set **Branch name pattern**: `main`
4. Enable: ✅ **Require status checks to pass before merging**
5. Enable: ✅ **Require branches to be up to date before merging**
6. Search and select these required status checks:
   - `Lint PHP`
   - `Lint Frontend`
   - `PHP Type Analysis`
   - `Tests (PHP 8.3)`
   - `Tests (PHP 8.4)`
   - `Build Assets`
7. Optionally enable:
   - ✅ **Require a pull request before merging**
   - ✅ **Require conversation resolution before merging**
   - ✅ **Do not allow bypassing the above settings**
8. Click **Create** or **Save changes**

### 4. Repeat for develop branch (optional)

If using a `develop` branch for integration:
- Create another branch protection rule with the same settings
- Branch name pattern: `develop`

## Workflow Details

### CI Pipeline Workflow

- **File**: `.github/workflows/ci.yml`
- **Name**: CI Pipeline
- **Triggers**: 
  - Pull requests to `main` and `develop`
  - Direct pushes to `main` and `develop`

### Jobs Breakdown

| Job | Duration | Purpose |
|-----|----------|---------|
| lint-php | ~30s | PHP code style (Laravel Pint) |
| lint-frontend | ~45s | Frontend linting (ESLint + Prettier) |
| type-analysis | ~40s | PHP static analysis (PHPStan) |
| tests (8.3) | ~2m | Full test suite on PHP 8.3 |
| tests (8.4) | ~2m | Full test suite on PHP 8.4 |
| build | ~1m | Frontend production build |

**Total parallel execution time**: ~2-3 minutes

### Caching Strategy

The workflow caches:
- Composer vendor directory (per PHP version)
- Node modules
- PHPStan result cache (via Composer cache)

**Cache key strategy**:
- Composer: `${{ runner.os }}-composer-${{ hashFiles('**/composer.lock') }}`
- Node: `${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}`
- PHP version specific: Includes PHP version in key

**Benefits**:
- Faster CI runs (dependencies only download once)
- Reduced GitHub Actions minutes usage
- Consistent builds

## Monitoring & Debugging

### View Workflow Runs

```bash
# List recent runs
gh run list --limit 10

# View specific run details
gh run view <run-id>

# Watch a running workflow
gh run watch <run-id>

# View run logs
gh run view <run-id> --log

# Re-run failed jobs
gh run rerun <run-id>
```

### Check PR Status

```bash
# View PR with status checks
gh pr view <pr-number>

# View PR checks specifically
gh pr checks <pr-number>
```

### Common Issues

#### Workflow not running
- **Cause**: First-time workflow needs approval
- **Fix**: Repository admin must approve workflow in the PR

#### Status checks not required
- **Cause**: Branch protection not configured
- **Fix**: Follow "Configure Required Status Checks" above

#### Cache issues
- **Cause**: Corrupted or outdated cache
- **Fix**: 
  1. Go to **Settings** → **Actions** → **Caches**
  2. Delete caches for the branch
  3. Re-run workflow

#### Failed lint checks
- **Fix locally**:
  ```bash
  composer lint          # Auto-fix PHP
  npm run lint           # Auto-fix JS/TS
  npm run format         # Auto-fix formatting
  ```

#### Failed tests
- **Debug locally**:
  ```bash
  cp .env.example .env
  php artisan key:generate
  php artisan test
  ```

## Security Best Practices

The CI workflow follows security best practices:

### ✅ Pinned Action Versions
All actions use commit SHA pins instead of tags:
```yaml
uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
```

### ✅ Minimal Permissions
Workflows use read-only permissions by default:
```yaml
permissions:
  contents: read
```

### ✅ No Credential Persistence
Credentials are not persisted in checkouts:
```yaml
with:
  persist-credentials: false
```

### ✅ Dependency Lock Files
All dependencies use lock files (composer.lock, package-lock.json)

### ✅ Automated Security Updates
Dependabot is configured to keep dependencies updated

## Cost Optimization

### GitHub Actions Minutes

Public repositories get unlimited minutes. Private repositories have limits based on plan.

**Current usage per CI run**:
- 6 jobs × ~2-3 minutes = ~12-18 minutes per PR
- Matrix testing: 2 PHP versions = 2× test job minutes

**Optimization strategies**:
1. Caching reduces minutes by ~50% after first run
2. Parallel jobs reduce wall-clock time
3. fail-fast: false in matrix allows all tests to complete
4. Consider removing PHP 8.3 from matrix once 8.4 is stable

### Storage (Caches)

- Cache size limit: 10 GB per repository
- Caches auto-expire after 7 days of no access
- Current cache usage: ~200-300 MB (vendor + node_modules)

## Maintenance

### Updating Actions

When updating pinned action versions:

1. Check for new releases: https://github.com/actions
2. Update both the SHA and the comment:
   ```yaml
   uses: actions/checkout@<new-sha> # v8.0.0
   ```
3. Test the workflow on a PR before merging

### Adding New Checks

To add a new CI job:

1. Add the job to `.github/workflows/ci.yml`
2. Test on a PR
3. After successful run, add to required checks in branch protection

### Disabling Specific Checks

To temporarily disable a job without removing it:

```yaml
jobs:
  job-name:
    if: false  # Disable job
    runs-on: ubuntu-latest
    # ...
```

## Support

For issues with GitHub Actions:
- GitHub Actions Documentation: https://docs.github.com/actions
- GitHub Community Forum: https://github.community/
- Repository Issues: https://github.com/maxBRT/steam-backlog/issues
