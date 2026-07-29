# OPCBridge Reports

`opcbridge-report` generates files from report definitions stored at
`/etc/opcbridge/report/reports.json`. Administrators can create, duplicate,
reorder, preview, publish, and delete definitions visually on SCADA's
**Reports** tab. Signed-in users can view published reports there and download
the selected month. The tab opens on the report-selection page; **New Report**
and **Edit** open the separate builder view.

The first report type is a monthly historian table:

- one row per local calendar day;
- one column per configured historian tag;
- the last good sample that actually exists within each day;
- a blank cell when no good sample exists that day;
- XLSX and CSV output.

Example:

```json
{
  "reports": [
    {
      "id": "monthly_flows",
      "name": "Monthly Flow Report",
      "description": "Daily flow values",
      "published": true,
      "timezone": "America/Chicago",
      "period": "month",
      "formats": ["xlsx", "csv"],
      "columns": [
        {
          "heading": "Influent Flow",
          "source": "historian",
          "connection_id": "PLC1",
          "tag_name": "InfluentFlow",
          "aggregation": "last",
          "precision": 1
        }
      ]
    }
  ]
}
```

The builder obtains its tag choices from the historian. `timezone` controls
calendar-day boundaries. `precision` controls spreadsheet and preview display
formatting but does not round the stored historian value. Draft reports can be
previewed by administrators; set `published` only when the report is ready for
other signed-in users. Preview and download use the same report-month picker,
which defaults to the current month. Internal report IDs are generated from the
name and are not exposed in the builder.

The CLI can list, preview, or generate reports directly:

```bash
/opt/opcbridge-suite/bin/opcbridge-report list \
  --definitions /etc/opcbridge/report/reports.json

/opt/opcbridge-suite/bin/opcbridge-report generate \
  --definitions /etc/opcbridge/report/reports.json \
  --id monthly_flows \
  --month 2026-07 \
  --format xlsx \
  --output /tmp/monthly-flows.xlsx

/opt/opcbridge-suite/bin/opcbridge-report preview \
  --definitions /etc/opcbridge/report/reports.json \
  --id monthly_flows \
  --month 2026-07 \
  --allow-unpublished
```

Template workbooks, ODS, PDF, SQL sources, additional aggregations, report
audit events, and more advanced layouts are planned extensions.
