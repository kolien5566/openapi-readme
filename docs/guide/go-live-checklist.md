# Go-Live Checklist

Use this checklist before enabling production traffic.

## Technical Validation

- OAuth2 token request succeeds.
- Site list pagination is handled correctly.
- Path, query, and body parameters are validated before requests.
- Response errors are logged with enough context for troubleshooting.
- Retry behavior avoids duplicate control commands.

## Operational Validation

- Support contacts are confirmed.
- Credential rotation procedure is documented.
- Monitoring and alerting are enabled.
- Rollback procedure is agreed with the partner team.
