# OPCBridge Reports

`opcbridge-report` generates files from report definitions stored at
`/etc/opcbridge/report/reports.json`. Report availability is controlled by
SCADA's custom groups. The first report available through any of the signed-in
user's groups is displayed immediately in the viewer, and changing the
selector loads another report. The report viewer keeps its calendar picker and
provides previous/next buttons for moving one report period at a time.

`/reports` is the focused reporting portal. It does not display SCADA health or
configuration navigation. A user whose groups grant report access but no SCADA
access is redirected there when opening the main SCADA URL. `scada.access`
explicitly grants the main SCADA portal and Overview page; existing operational
permissions also imply that access so established operator groups continue to
work.

Three global permission functions control entry and report creation:

- `reports.access` opens the Reports portal.
- `reports.create` allows the user to create reports through any group that
  grants it.
- `reports.administer` grants unrestricted access to every report and its
  settings.

Each report separately grants custom groups **View**, **Download**, **Edit**, or
**Manage** access. Manage access includes viewing, downloading, editing,
publishing, duplicating, deleting, and changing that report's access list.
Edit access can change the report definition but cannot publish it or change
its access list. Download access applies only to published reports.
Administrators always retain full access.

Every newly created report records the authenticated username in
`created_by`. The creator always has View, Download, Edit, and Manage access to
that report, even if their group memberships later change. Ownership does not
replace general portal authorization: the creator must still have
`reports.access`, `reports.create`, or `reports.administer` to enter the Reports
portal. Duplicating a report makes the user who created the copy its owner.

These rules are intentionally strict. Signing in does not grant report access,
and older report definitions without a current `access` list are accessible
only through `reports.administer`. Existing report ACL entries using `role_id`
are not translated; report access must be reassigned using `group_id`.

Report types determine the calendar range and default row grouping:

- Daily reports use hourly rows.
- Monthly reports use daily rows.
- Yearly reports use monthly rows.
- Custom date-range reports use inclusive start/end pickers and group rows by
  hour, day, or month.

For custom ranges, previous/next shifts by the inclusive length of the selected
range.

The first report type is a monthly historian table:

- one row per local calendar day;
- one column per configured historian tag;
- the last good sample that actually exists within each day;
- a blank cell when no good sample exists that day;
- XLSX and CSV output.

The report editor can also discover MySQL connections defined in Logger. After
selecting a connection, it lists tables/views and their columns without
exposing credentials. When each measurement has its own database column, users
select those fields directly. When item names and values are stored in rows,
users select the columns containing the names and values, then choose which
item names should appear in the report. Historian and database fields may be
added to the same definition because source mapping is stored on each report
column. Logger executes bounded, schema-validated time-range queries and the
report generator combines those results with historian values in the same
calendar-day rows.

Daily reports support `interval_minutes` values of `1`, `5`, `10`, `15`, `30`,
or `60` (the default). The selected interval creates timezone-aware rows across
the chosen day, and each database aggregation is evaluated within those
buckets. The source database or historian must already contain samples at the
required frequency; report intervals do not increase collection frequency.

Custom reports can use `group_by: "raw"` to show stored samples without
aggregation. Raw output creates a row for every unique millisecond timestamp
returned by the selected columns and leaves a cell blank when that column has
no sample at that timestamp. Previews are limited to 5,000 rows to protect the
browser; downloads are limited to 250,000 rows. The UI reports when either a
source limit or the output row limit truncates the result.

Reports may include optional summary footer rows. Each footer has a
user-defined label and an independent calculation for every report column:
total, average, minimum, maximum, first, last, sample count, missing count, or
blank. Calculations use the displayed report rows. Consequently, summaries on
a truncated raw report describe only the returned rows.

Report columns may also be calculated from other columns after source samples
have been placed into their report-time buckets. Formula references use stable
column IDs and support arithmetic, comparisons, `and`, `or`, `not`, `if()`,
`coalesce()`, `min()`, `max()`, `avg()`, `abs()`, `round()`, and `null`. Source columns
needed only by a formula may be hidden from previews and downloaded files while
remaining available to the calculation.

Database columns may use **Last non-zero value** when a valid daily reading
must not be replaced by a later zero. The aggregation returns the last non-zero
numeric sample in the bucket, or zero when the bucket contains only zero values.

Database report columns can use **Change during period** for accumulating
counters. Each row subtracts the last reading before that row began from the
row's ending reading. A per-column multiplier is applied afterward. Counter
decreases may be left blank, treated as a reset, or calculated using a
configured rollover modulus such as `65536` for an unsigned 16-bit counter.

Example:

```json
{
  "reports": [
    {
      "id": "monthly_flows",
      "name": "Monthly Flow Report",
      "description": "Daily flow values",
      "published": true,
      "access": [
        {
          "group_id": "lab",
          "view": true,
          "download": true,
          "edit": false,
          "manage": false
        }
      ],
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
previewed through groups with Edit or Manage access. Set `published` only when
the report is ready for groups with View access; only groups with Manage access
can change this setting. Preview and download use the same report-period
controls, which default to the current period. Internal report IDs are
generated from the name and are not exposed in the builder.

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
