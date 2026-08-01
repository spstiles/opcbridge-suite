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

Workbook layout is configured in the SCADA report builder. Placed cells can
contain custom text, standard report values (including reporting dates and the
report timezone), or aggregate formulas such as `sum([flow_total])`. A target
may be one cell (`A1`) or a merged range (`A1:F1`). Spreadsheet templates are
optional; the same placements work in newly generated workbooks.
