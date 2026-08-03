# Data entry

OPCBridge separates database integration from form design. Administrators
create data-entry targets that map database fields to their meaning. Form
creators select an approved target and define only operator-facing fields.
Targets and forms are stored in `/etc/opcbridge/data-entry/forms.json`.
Database credentials continue to come from Logger database connections.

A target selects a writable table and assigns a meaning to each relevant
database field. Sources include operational date/time, operational epoch
milliseconds, save time, connection/target/form metadata, item name, numeric
or text entered value, and fixed values. Database-generated fields are hidden.
Schema discovery highlights required fields and prevents a target from being
saved until each required field has a source.

The form editor does not expose database structure. It selects an approved
target and defines labels, item keys, value types, units, precision, validation,
and display order. The available numeric and text types are limited by the
target. Loading a date returns existing records for the form's items. Saving
performs inserts, updates, and explicitly marked deletions in one transaction.

Successful saves are recorded in `/var/lib/opcbridge/data-entry/audit.jsonl`
with the form, operational date, actor or station address, submitted changes,
and operation counts.

The first implementation supports MySQL Logger connections. ODBC data-entry
operations require future Logger ODBC query support.

Permissions:

- `data_entry.access` loads and edits operational values.
- `data_entry.administer` creates, changes, and deletes form definitions.

An HMI-enabled form can be selected by the HMI Data Entry Form object. Forms
may require a logged-in user or deliberately permit entry from an unattended
HMI station.

## Implementation status and next steps

The first target/form implementation was committed in suite `0.4.09` at
commit `21c1faa`. Work paused immediately after the combined form/database
builder was split into two workflows:

- **Manage Targets** is the administrator-facing database integration screen.
- **New/Edit Form** selects an approved target and defines operator-facing
  fields without exposing database metadata.
- The SCADA Data Entry page can load a selected operational date, move to the
  previous or next day, edit values, save/revert changes, mark permitted
  deletions, and download the displayed values as CSV.
- The HMI contains a Data Entry Form object that consumes the same definitions.
- Logger supports MySQL category-style tables with either database date/time or
  epoch-millisecond operational timestamps.

The redesign was prompted by a test form named `Lab Data`. Its first insert
failed because the table required `job_name`. Additional fields such as
`timestamp_ms` and `connection_id` demonstrated that database meaning could not
be safely inferred by an ordinary form creator. These responsibilities now
belong to the target administrator. Typical target mappings may include:

- `timestamp_ms` → operational timestamp in milliseconds
- `connection_id` → database connection ID
- `job_name` → form name
- the table's item/tag field → item/tag name
- the appropriate value field → entered numeric or text value

The next session should begin with end-to-end testing rather than more UI work:

1. Install suite `0.4.09` components for core, Logger, SCADA, and HMI.
2. Create a target for the table used by `Lab Data` and inspect the suggested
   mappings carefully.
3. Recreate or edit `Lab Data` to select that target. Forms saved by the earlier
   combined builder do not have a target assignment.
4. Test a new insert, reload, update, and permitted deletion for one date.
5. Verify epoch-millisecond time conversion and the values written for required
   metadata columns directly in the database.
6. Verify the SCADA preview/date navigation/CSV behavior and then the HMI form
   object.

Questions deliberately left open until testing:

- Whether the target source names and explanations are clear enough for an
  administrator.
- Whether target administration needs a permission separate from form design.
- Whether wide, one-row-per-entry tables should ever be supported in addition
  to the initial category/item-value layout.
- Whether OPCBridge should eventually provide its own managed data-entry schema
  as the simplest default while retaining custom targets as an advanced option.
