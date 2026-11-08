# Polling recovery baseline

The core polling implementation has been restored to commit `1c5aa4b`, the
revision immediately before the polling experiments in this investigation.
That revision shipped suite 0.5.87 and core 0.2.99. It is a recovery baseline,
not a claim that this is the user's last satisfactory installation.

This removes the experimental Logix retry policy, additional timing
instrumentation, request window, and admission scheduler. The main source and
asynchronous batch helper and test match that revision exactly. Shared alarm
and historian configuration changes remain intact. Release versions can move
forward independently of this code restoration.

No remote configuration or installation is changed by this source rollback.
Field Ops was changed from one to two polling lanes during the investigation;
return it to one lane when comparing with the original configuration. Other
connection settings were not changed by these source experiments.

After installation, validate PLC_Second/PLC_Seconds in the actual HMI as well
as the core cached timestamps. A recent core sample does not establish that
browser displays receive updates promptly. Measure recovery before making
further polling changes.
