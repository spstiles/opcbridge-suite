# HMI Expression Alias Notes

Future HMI and expression work should avoid requiring users to remember or repeatedly type long system tag paths.

## Goal

Keep canonical system tag paths stable while providing readable aliases for common expression use.

Canonical tags should remain unchanged, for example:

- `System/Clock/FastBlink`
- `System/Clock/SlowBlink`
- `System/Clock/OneSecondPulse`
- `System/Clock/MinutePulse`
- `System/Reporter/DataChecks/<check_id>/Ok`
- `System/Reporter/Databases/<database_id>/Ok`

Expressions should be able to use shorter aliases, for example:

- `$FastBlink`
- `$SlowBlink`
- `$OneSecondPulse`
- `$MinutePulse`
- `$DailyRecordsOk`
- `$MainDbOk`

## Built-In Aliases

Built-in aliases should be read-only, always available, and documented. Initial candidates:

- `$FastBlink` -> `System/Clock/FastBlink`
- `$SlowBlink` -> `System/Clock/SlowBlink`
- `$OneSecondPulse` -> `System/Clock/OneSecondPulse`
- `$MinutePulse` -> `System/Clock/MinutePulse`

## User-Defined Aliases

Later, allow users to define aliases for longer system or process tags.

Examples:

- `$DailyRecordsOk` -> `System/Reporter/DataChecks/daily_record_count/Ok`
- `$MainDbOk` -> `System/Reporter/Databases/main/Ok`
- `$PumpRunning` -> `Connectivity/MainPLC/PumpRunning` or the canonical tag reference used by the expression engine

## UI Notes

Expression editors should eventually include a picker/autocomplete so users do not need to memorize tag paths or alias names.

The picker should expose both:

- canonical tags
- aliases

Aliases should improve readability, but diagnostics should still be able to show the resolved canonical tag path.

## Design Principle

Aliases are a readability layer. They should not replace canonical tags, change tag identity, or make SCADA, OPC UA, HMI, and alarms disagree about the underlying value.
