# Security Policy

## Reporting a Vulnerability

We take security issues seriously. If you believe you have found a security vulnerability in our project, please report it to us as described below.

## Accepted Risks

### `xlsx` - Prototype Pollution

- **Vulnerability:** Prototype Pollution
- **Package:** `xlsx`
- **Severity:** High
- **Decision:** Accepted Risk
- **Justification:** This vulnerability is related to the command-line (CLI) version of the `xlsx` library. Our project uses this library only for generating XLSX files on the server-side and does not use the CLI version. Therefore, our specific use case is not affected by this vulnerability. We will continue to monitor updates and reconsider this decision if our use of the library changes.
