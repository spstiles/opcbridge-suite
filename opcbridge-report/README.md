# OPCBridge Report

`opcbridge-report` generates downloadable reports from published JSON
definitions. The first implementation supports monthly historian reports using
the last good sample that exists within each local calendar day.

## Development

```bash
composer install --working-dir opcbridge-report
opcbridge-report/opcbridge-report list \
  --definitions opcbridge-report/reports.json.example \
  --allow-unpublished
```

After creating a definition in the SCADA report builder, it can also be
generated directly during development:

```bash
opcbridge-report/opcbridge-report generate \
  --definitions opcbridge-report/reports.json.example \
  --id monthly_flows \
  --month 2026-07 \
  --format xlsx \
  --output /tmp/monthly-flows.xlsx \
  --allow-unpublished
```

The generated workbook contains a title, period, generation timestamp, frozen
and filtered headers, one row per local calendar day, and one column per
configured historian tag. Days without a good historian sample remain blank.
