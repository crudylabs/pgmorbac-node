# Changelog

The package version is the pgmorbac extension version it ships. Extension
changes are in the [pgmorbac changelog](https://github.com/crudylabs/pgmorbac/blob/master/CHANGELOG.md).

## [1.0.2] - 2026-11-06

Ships pgmorbac 1.0.2: `is_allowed()` and `is_allowed_nocache()` answer FALSE
for a NULL user instead of failing on `auth_cache`, and `upgradeScripts()` now
includes `pgmorbac--1.0.1--1.0.2.sql`.

## [1.0.1] - 2026-10-14

Ships pgmorbac 1.0.1: `is_allowed_nocache()` no longer resolves roles once per
rule row of every tenant, and `upgradeScripts()` now includes
`pgmorbac--1.0.0--1.0.1.sql`.

## [1.0.0] - 2026-10-03

Published from the extension repository before this one existed; the same SQL
and API (`extensionSql()`, `upgradeScripts()`, `version`, `sqlDir`,
`controlFile`). Releases after 1.0.0 are published from here.
