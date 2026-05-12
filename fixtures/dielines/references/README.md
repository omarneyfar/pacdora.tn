# Dieline Reference Fixtures

Put authorized source-of-truth dielines here when exact template matching is required. These files are private verification fixtures, not product data.

Suggested provider folders:

- `cefbox/`
- `ecma/`
- `fefco/`
- `pacdora/`
- `templatemaker/`
- `newprint/`
- `packmage/`

Each reference set should include a small manifest:

```json
{
  "sourceName": "cefBox",
  "sourceUrl": "https://example.test/template",
  "templateName": "Reverse Tuck End",
  "category": "Folding Box",
  "downloadedAt": "2026-05-11",
  "allowedUse": "private-reference-only",
  "parametersUsed": {},
  "files": {
    "pdf": null,
    "dxf": null,
    "svg": null,
    "screenshot": null
  },
  "notes": "",
  "comparisonStatus": "not-compared"
}
```

The verification script may compare generated graphs against authorized SVG/DXF fixtures when those files exist. Keep source files in millimeters, with stable layer names such as `cut`, `crease`, `perf`, `window`, `hole`, `bleed`, and `safe`.
