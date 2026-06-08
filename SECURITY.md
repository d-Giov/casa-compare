# Security Policy

## Reporting Vulnerabilities

Please report security issues privately by opening a GitHub Security Advisory:
https://github.com/d-Giov/casa-compare/security/advisories/new

Do **not** open public issues for security vulnerabilities.

## Secrets & Credentials

- `.env.local` is git-ignored — never commit real credentials
- Supabase service role key is server-side only (never in client bundles)
- OpenAI API key is server-side only

## Dependency Scanning

Run `npm audit` from `webapp/` to check for known vulnerabilities.

## Extension Permissions

The Chrome extension requests minimal permissions:
- `activeTab` — read current tab URL/DOM for scraping
- `scripting` — inject content script
- `storage` — cache auth token locally
- `tabs` — find open webapp tab for auth token retrieval
