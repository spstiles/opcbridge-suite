# Tools

## `sip_test.sh`

Minimal headless SIP test dialer for placing a call through a SIP server/PBX.

Requirements:
- `pjsua` (Debian/Ubuntu: `sudo apt-get install -y pjsip-tools`)

Example:
```bash
SIP_PASS='***' ./sip_test.sh --server 10.0.0.10:5060 --ext 1000 --pass "$SIP_PASS" --to 15555551212 --duration 20
```

Notes:
- Uses `--null-audio` so it works on servers without audio devices.
- This is intended for quick connectivity/dial-plan validation, not production SIP.
