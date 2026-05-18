# Data Logger Field Mapping Notes

## Goal

Capture a future data logger feature: allow each logger job to map tag values and
metadata into custom database fields.

Today the logger writes a fixed schema such as connection, tag name,
description, timestamp, datatype, quality, and value. That is useful for a
generic tag log, but some databases or reports need specific column names and
field layouts.

## Use Cases

- Store a tag value into a customer-specific column name.
- Include or omit standard metadata fields per logger.
- Rename standard fields such as `tag_name`, `tag_description`, or `value_text`.
- Store static fields with each row, such as site, area, report name, or unit.
- Map one tag's description into a separate database column.
- Support existing external database/report tables without requiring them to use
  opcbridge's default schema.

## Possible Model

Add an optional `field_map` section to a logger job.

Example:

```json
{
  "id": "hourly_flow_log",
  "database_id": "histdata",
  "table": "flow_history",
  "tags": [
    {
      "connection_id": "plant",
      "name": "Flow.Total",
      "description": "Plant total flow"
    }
  ],
  "field_map": {
    "timestamp_ms": "sample_time_ms",
    "connection_id": "source_connection",
    "tag_name": "source_tag",
    "tag_description": "description",
    "value_float": "flow_value",
    "quality": "quality_code"
  },
  "static_fields": {
    "site": "Racine",
    "system": "Wastewater"
  }
}
```

## Design Notes

- Keep the current fixed schema as the default.
- Make custom mapping optional per logger job.
- Validate mappings before saving or running.
- Only allow known source fields at first.
- Avoid arbitrary SQL string substitution for safety.
- If a mapped destination column is missing, either fail clearly or offer an
  explicit "create/update table" action.
- CSV upload/download for logger tag lists should remain focused on tags:
  `connection_id`, `tag_name`, `description`.

## Open Questions

- Should mapping be per logger job, per database, or both?
- Should values be written as one row per tag, or should a logger support a wide
  row where multiple tags become multiple columns?
- Should static fields be typed, or always written as strings?
- Should computed fields wait for the future logic/expression module?
- Should custom field mapping be shared with historian, or kept separate from
  historian's time-series schema?
