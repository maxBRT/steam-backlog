# Secrets Management

This document describes how secrets and sensitive configuration are managed in the Steam Backlog application.

## Principles

1. **Never commit secrets to version control**
2. **Use environment variables for all secrets**
3. **Provide `.env.example` template without real values**
4. **Document all required secrets and how to obtain them**

## Required Secrets

### Application Key (APP_KEY)

Laravel's encryption key for sessions, cookies, and encrypted data.

**How to generate:**
```bash
php artisan key:generate
```

This command automatically sets `APP_KEY` in your `.env` file. Required for both local development and production.

**Security:** This key is used to encrypt session data and other sensitive information. Keep it secret. Do not reuse the same key across environments.

### Steam API Key (STEAM_API_KEY)

Steam Web API key for accessing Steam endpoints like `GetOwnedGames`.

**How to obtain:**
1. Visit [https://steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
2. Sign in with your Steam account
3. Register a domain (use `localhost` for local development, your production domain for production)
4. Copy the generated key

**Where to use:**
- Local development: Add to `.env`
- Production (Laravel Cloud): Set as environment variable

**Documentation:** [Steam Web API Documentation](https://partner.steamgames.com/doc/webapi_overview)

### Database Credentials (DB_*)

Database connection parameters.

**Local (SQLite):**
No credentials needed. Just use:
```
DB_CONNECTION=sqlite
```

**Production (PostgreSQL on Laravel Cloud):**
```
DB_CONNECTION=pgsql
DB_HOST=<provided-by-laravel-cloud>
DB_PORT=5432
DB_DATABASE=steam_backlog
DB_USERNAME=<provided-by-laravel-cloud>
DB_PASSWORD=<provided-by-laravel-cloud>
```

Laravel Cloud automatically provisions PostgreSQL and provides these credentials.

### Session Configuration

**Session Lifetime (SESSION_LIFETIME):**
- Local: 10080 minutes (7 days) for development convenience
- Production: Consider shorter duration based on security requirements

**Session Security (in production):**
```
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
```

Set `SESSION_SECURE_COOKIE=true` in production to ensure session cookies are only sent over HTTPS.

## Environment-Specific Configuration

### Local Development (.env)

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Generate application key:
   ```bash
   php artisan key:generate
   ```

3. Add your Steam API key:
   ```
   STEAM_API_KEY=your_development_key_here
   ```

4. Configure other settings as needed

### Production (Laravel Cloud)

Laravel Cloud uses environment variables, not `.env` files.

**To set secrets in Laravel Cloud:**

1. Navigate to your project in the Laravel Cloud dashboard
2. Go to Environment → Environment Variables
3. Add each secret as a key-value pair:
   - `APP_KEY`: Generate with `php artisan key:generate --show` locally, then paste
   - `STEAM_API_KEY`: Your production Steam API key
   - `DB_*`: Auto-configured by Laravel Cloud
   - `SESSION_SECURE_COOKIE`: Set to `true`

4. Redeploy the application for changes to take effect

**Production checklist:**
- [ ] `APP_KEY` is set and unique to production
- [ ] `STEAM_API_KEY` uses production Steam API key (registered with production domain)
- [ ] `APP_ENV=production`
- [ ] `APP_DEBUG=false`
- [ ] `SESSION_SECURE_COOKIE=true`
- [ ] Database credentials are configured
- [ ] `APP_URL` matches production domain
- [ ] `STEAM_RETURN_URL` uses your production callback URL
- [ ] `STEAM_REALM` is unset or set to your production host only (not a full URL)

## Security Best Practices

### General

- **Rotate secrets periodically**, especially `APP_KEY` and `STEAM_API_KEY`
- **Use different keys per environment** (local, staging, production)
- **Never log secret values** in application code
- **Never expose secrets in error messages** or API responses
- **Review `.gitignore`** regularly to ensure secret files are excluded

### Handling Secret Exposure

If a secret is accidentally committed or exposed:

1. **Immediate actions:**
   - Rotate the compromised secret immediately
   - Update all environments with the new secret
   - For `APP_KEY`: Generate new key and redeploy
   - For `STEAM_API_KEY`: Revoke old key at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) and generate new one

2. **Git cleanup (if committed):**
   ```bash
   # Use git-filter-repo or BFG Repo-Cleaner to remove from history
   # Contact team lead before rewriting public repository history
   ```

3. **Post-incident:**
   - Document what happened
   - Review how the exposure occurred
   - Update processes to prevent recurrence

### Code Review Checklist

When reviewing pull requests, verify:
- [ ] No hardcoded secrets in code
- [ ] New secrets are added to `.env.example` (without real values)
- [ ] New secrets are documented in this file
- [ ] Configuration uses `env()` helper to read secrets
- [ ] No secrets in commit messages or PR descriptions

## Configuration Files

### Files that use secrets

| File | Purpose | Secrets Used |
|------|---------|--------------|
| `config/app.php` | Application configuration | `APP_KEY`, `APP_ENV`, `APP_DEBUG` |
| `config/database.php` | Database connections | `DB_*` |
| `config/session.php` | Session configuration | Session security settings |
| `config/services.php` | Third-party services | `STEAM_API_KEY`, `STEAM_RETURN_URL`, `STEAM_REALM` |

### Adding new secrets

When adding a new secret:

1. **Add to `.env.example`** with empty value or placeholder:
   ```
   NEW_SECRET_KEY=
   ```

2. **Add to `config/services.php`** (or appropriate config file):
   ```php
   'new_service' => [
       'secret' => env('NEW_SECRET_KEY'),
   ],
   ```

3. **Document in this file** with:
   - What the secret is for
   - How to obtain it
   - Environment-specific considerations

4. **Update production environment variables** via Laravel Cloud dashboard

## Troubleshooting

### "No application encryption key has been specified"

**Cause:** `APP_KEY` is not set in `.env`

**Solution:**
```bash
php artisan key:generate
```

### Steam API calls failing with 403

**Cause:** Invalid or missing `STEAM_API_KEY`

**Solution:**
1. Verify key is set in `.env` or environment variables
2. Check key is valid at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
3. Ensure domain registration matches your environment (localhost vs production domain)

### Sessions not persisting

**Cause:** Multiple possible causes related to session configuration

**Solution:**
1. Verify `SESSION_DRIVER=database` is set
2. Run migrations: `php artisan migrate`
3. Check `sessions` table exists in database
4. In production, verify `SESSION_SECURE_COOKIE` matches HTTPS availability

## References

- [Laravel Environment Configuration](https://laravel.com/docs/11.x/configuration#environment-configuration)
- [Laravel Encryption](https://laravel.com/docs/11.x/encryption)
- [Steam Web API Documentation](https://partner.steamgames.com/doc/webapi_overview)
- [Laravel Cloud Documentation](https://cloud.laravel.com/docs)
