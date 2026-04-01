# TOUR-035 — Schema Version Migration (Future)

## Summary

Future feature: when the YAML schema evolves beyond v1.0, the authoring UI should be able to upgrade older schema versions to the latest. The player should validate against the declared version and provide clear errors if a file is too new for the player.

## Design Notes

- Keep a single schema file until a breaking change is needed, then split into `src/schemas/v1.0.ts`, `v2.0.ts`, etc.
- Additive changes (new optional fields) don't require a new version - the schema just gains optional fields
- Breaking changes (renamed fields, changed types) require: new schema file, migration function, version bump
- The authoring UI's "Import YAML" should detect old versions and offer to upgrade
- Migration chain: v1.0 → v1.1 → v2.0 → current (each step is a small transform)
- The player only works with the latest types internally

## Deployment Best Practice

Users embedding MapTour should reference a tagged release, not `main`:
```html
<script src="https://github.com/ORG/maptour/releases/download/v1.2.0/maptour.js"></script>
```
This ensures the player version matches the schema version of their YAML file.

## Status

Not yet needed - v1.0 is the only schema version. This spec exists as a placeholder for when schema evolution becomes necessary.
