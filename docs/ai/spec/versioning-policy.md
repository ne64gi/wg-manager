# Versioning Policy

## Effective Date

- this policy starts after `v1.0.0` is released
- before `v1.0.0`, version values may move for release preparation

## Format

- version format is `x.y.z`

## Meaning

- `x`: major release
  - use when the project takes a large step forward
  - this is a developer decision, not an automatic increment
  - examples: major architecture shift, release line reset, product-level milestone
- `y`: feature release
  - increment when new user-facing or operator-facing functionality is added
  - examples: new API route group, new management flow, new dashboard capability
- `z`: patch release
  - increment for small bug fixes and low-risk polish
  - examples: copy fixes, layout fixes, validation fixes, small logic corrections

## Rules For Agents

- do not change `x` unless the maintainer explicitly decides the project is taking a major step
- change `y` when merging meaningful feature additions after `v1.0.0`
- change `z` for bug fixes that do not add a new capability
- keep `VERSION`, backend version reporting, and frontend displayed version aligned

## Examples

- `1.0.0 -> 1.0.1`
  - bug fix only
- `1.0.1 -> 1.1.0`
  - feature added
- `1.4.3 -> 2.0.0`
  - major release decision by maintainer
