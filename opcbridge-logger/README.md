
### Experimental verified live inputs

A log job can opt in to verified physical samples in `reports.json`:

```json
{
  "id": "verified-log",
  "database_id": "local",
  "enabled": true,
  "tags": ["PLC:Input"],
  "require_fresh_read": true,
  "fresh_max_age_ms": 0,
  "fresh_timeout_ms": 1000
}
```

Existing jobs keep cached reads by default. Verified jobs request every selected
live input through OPCBridge's `/polling/fresh-read` endpoint before opening the
write connection. Exact references remain required even when absent from tag
discovery; patterns and all-tag selections resolve through discovery. Duplicate
selections are merged. Requests use batches of up to 64 inputs, with all samples
collected and validated before database access. If any batch fails, no samples
from that verification attempt are written. This does not make later SQL writes
transactional or simultaneous across tags; each sample retains its acquisition
timestamp.

`fresh_max_age_ms` accepts integers 0..60000 (default zero); zero requires reads
started after each batch request. `fresh_timeout_ms` accepts integers 0..5000
(default 1000), per batch. Timeouts, missing/disabled/unsupported tags, an older
core without verification, invalid identities, bad quality and null samples fail
the job without a cached fallback. The experimental core endpoint currently
supports only physical Allen-Bradley scalar tags, generated array elements, and poll-derived aliases/bits, so broad selections containing
other sources will fail verification. Database-specific OPCBridge URLs are honored.
Historian-only jobs retain their existing behavior.

Run `make test-freshness` for the disposable HTTP verification fixtures. These
use ports 18182 and 18195 and do not require or write to a database.
