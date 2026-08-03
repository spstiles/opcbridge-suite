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
