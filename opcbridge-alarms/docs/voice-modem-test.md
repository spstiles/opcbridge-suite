# Voice Modem Test Utility

`voice-modem-test` is a standalone hardware probe for serial AT-command voice modems. Use it to
verify modem hardware before enabling alarm-server dial-out in `opcbridge-alarms`.

## Build

```bash
cd opcbridge-alarms
./build-modem-test.sh
```

## Find a modem device

```bash
./voice-modem-test --list
```

Common Linux device names are `/dev/ttyUSB0`, `/dev/ttyACM0`, `/dev/ttyS0`, or `/dev/modem`.
If the modem is present but cannot be opened, check that the user running the command has
permission to access the device, often via the `dialout` group.

## Probe the modem

```bash
./voice-modem-test --device /dev/ttyUSB0
```

The probe sends:

- `AT`
- `ATE1`
- `ATI`
- `AT+FCLASS=?`

`AT+FCLASS=?` reports the modem's supported fax/data/voice classes. Voice-capable modems often
include `8` in the response.

If the modem uses a different speed:

```bash
./voice-modem-test --device /dev/ttyUSB0 --baud 57600
```

Supported baud rates are `9600`, `19200`, `38400`, `57600`, and `115200`.

## Dial a test call

Use a safe test number first. The utility dials with `ATD<number>;`, where the trailing semicolon
requests a voice call rather than a data call on typical Hayes-compatible modems.

```bash
./voice-modem-test --device /dev/ttyUSB0 --number 5551212 --dial-seconds 20
```

By default, the tool sends `ATH` after the wait period. To leave the call up:

```bash
./voice-modem-test --device /dev/ttyUSB0 --number 5551212 --no-hangup
```

Some voice modems require voice mode before dialing:

```bash
./voice-modem-test --device /dev/ttyUSB0 --voice-init --number 5551212
```

That sends `AT+FCLASS=8` before dialing.

## Send custom AT commands

```bash
./voice-modem-test --device /dev/ttyUSB0 --command 'AT+FCLASS?' --command 'AT+VLS=?'
```

Use this to inspect vendor-specific voice features before implementing alarm-server dial-out.
