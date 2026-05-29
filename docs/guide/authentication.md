# Authentication

The OpenAPI specification declares OAuth2 client credentials authentication.

## Token Handling

- Store `client_id` and `client_secret` securely.
- Do not expose credentials in browser-side production code.
- Refresh tokens before expiration where possible.
- Send the access token with protected API requests.

## Environment Policy

Use separate credentials and base URLs for test and production environments. Never reuse test credentials in production systems.
