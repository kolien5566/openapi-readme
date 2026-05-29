# Getting Started

This SOP introduces the minimum workflow for integrating with the Pylontech RESS OpenAPI.

## Before You Start

- Confirm that your partner account has been approved.
- Keep test and production credentials separate.
- Use the test environment until all required API flows have passed verification.
- Review authentication and retry behavior before sending production traffic.

## Integration Flow

1. Request an OAuth2 access token.
2. Query the authorized site list.
3. Fetch site and device details.
4. Retrieve telemetry and energy statistics.
5. Validate fault, alarm, and dispatch flows if your integration uses them.
6. Complete the go-live checklist before production enablement.

::: tip
Use the API Reference section to inspect parameters, schemas, responses, and playground requests.
:::
