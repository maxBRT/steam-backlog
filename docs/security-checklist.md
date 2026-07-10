# Security Checklist

Use this checklist before deploying to production or when reviewing security posture.

## Pre-Deployment Checklist

### Environment Configuration

- [ ] `APP_ENV=production`
- [ ] `APP_DEBUG=false`
- [ ] `APP_KEY` is set and unique to production (different from dev/staging)
- [ ] `APP_URL` matches production domain

### Secrets Management

- [ ] All required secrets are set in Laravel Cloud environment variables
- [ ] `STEAM_API_KEY` is registered with production domain
- [ ] No secrets are hardcoded in application code
- [ ] No secrets are committed to version control
- [ ] `.gitignore` properly excludes `.env*` files

### Database Security

- [ ] Production database uses strong password
- [ ] Database is not publicly accessible
- [ ] Database credentials are unique to production
- [ ] Regular backups are configured (via Laravel Cloud)

### Session Security

- [ ] `SESSION_DRIVER=database`
- [ ] `SESSION_SECURE_COOKIE=true` (requires HTTPS)
- [ ] `SESSION_HTTP_ONLY=true`
- [ ] `SESSION_SAME_SITE=lax` (or `strict` for higher security)
- [ ] `SESSION_LIFETIME` is appropriate for your use case

### HTTPS / SSL

- [ ] Application is served over HTTPS
- [ ] SSL certificate is valid and not self-signed
- [ ] HTTP is redirected to HTTPS
- [ ] Steam OpenID return URLs use HTTPS

### Laravel Configuration

- [ ] `BCRYPT_ROUNDS=12` (or higher if performance allows)
- [ ] Unnecessary services are disabled
- [ ] Log level is appropriate (`error` or `warning` in production)
- [ ] Maintenance mode is tested and working

### Steam API Security

- [ ] Steam API key is scoped to production domain
- [ ] Steam OpenID callback URL is whitelisted
- [ ] API rate limits are understood and handled

## Code Security Review

### General

- [ ] All user input is validated
- [ ] SQL queries use parameter binding (Eloquent handles this)
- [ ] No `eval()` or similar dangerous functions
- [ ] Error messages don't expose sensitive information
- [ ] File uploads (if any) are validated and sanitized

### Authentication

- [ ] Steam OpenID integration is secure
- [ ] Sessions are properly invalidated on logout
- [ ] CSRF protection is enabled (Laravel default)
- [ ] No authentication bypass vulnerabilities

### Authorization

- [ ] Users can only access their own data
- [ ] Admin/privileged actions are protected
- [ ] Library entries are scoped to authenticated user

### Data Protection

- [ ] Sensitive data is encrypted at rest (if applicable)
- [ ] Personal data handling complies with regulations (GDPR, etc.)
- [ ] User data deletion is implemented (if required)

## Deployment Process

- [ ] Deployment uses CI/CD pipeline (GitHub Actions, etc.)
- [ ] Secrets are injected at deploy time, not stored in repo
- [ ] Migrations are run before code deployment
- [ ] Rollback plan is documented and tested
- [ ] Monitoring and alerting are configured

## Post-Deployment Verification

- [ ] Application is accessible at production URL
- [ ] Steam authentication works end-to-end
- [ ] Database migrations completed successfully
- [ ] Queue workers are running
- [ ] Scheduled tasks are configured
- [ ] Error monitoring is working (Sentry, Bugsnag, etc.)
- [ ] SSL certificate is valid and working
- [ ] Session persistence works across requests

## Ongoing Security

### Monthly

- [ ] Review application logs for suspicious activity
- [ ] Check for outdated dependencies (`composer outdated`, `npm outdated`)
- [ ] Verify backups are working

### Quarterly

- [ ] Review and rotate secrets if needed
- [ ] Security audit of authentication flows
- [ ] Review Laravel security releases and update

### Annually

- [ ] Comprehensive security review
- [ ] Penetration testing (if budget allows)
- [ ] Review and update this checklist

## Incident Response

If a security incident occurs:

1. **Assess severity:**
   - Data breach? User impact? System compromise?

2. **Immediate actions:**
   - Isolate affected systems if needed
   - Rotate compromised credentials
   - Document timeline and actions taken

3. **Investigation:**
   - Review logs for attack vector
   - Identify scope of compromise
   - Document findings

4. **Remediation:**
   - Patch vulnerability
   - Update affected systems
   - Notify affected users if required

5. **Post-incident:**
   - Document lessons learned
   - Update security practices
   - Implement preventive measures

## Resources

- [Laravel Security Best Practices](https://laravel.com/docs/11.x/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Steam API Best Practices](https://partner.steamgames.com/doc/webapi_overview)
- [Secrets Management Documentation](./secrets-management.md)
