# Getting Started

This page is a sample SOP. Replace it with your partner onboarding process, test credentials policy, request signing rules, or production go-live checklist.

## Before You Start

- Confirm that your client application has a valid `client_id` and `client_secret`.
- Use the test environment first and keep production credentials separate.
- Check the API Reference for request parameters, response schemas, and error formats.

## Basic Workflow

1. Request an access token through the OAuth2 token endpoint.
2. Query the authorized site list.
3. Fetch site details and device telemetry for a known site.
4. Validate pagination, retry behavior, and error handling.
5. Move to production only after integration verification is complete.

## Notes

You can add more SOP files under `docs/`. Markdown files and static HTML files are both supported by this page shell.
