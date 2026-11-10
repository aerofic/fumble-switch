# Fumble Switch — local edition 99.0

Foundry VTT V14 customization of [Fumble Switch](https://github.com/rklos/fvtt-fumble-switch) by Radoslaw Klos, distributed under its MIT license.

## Changes

- Replaces fixed nudging with an inclusive, uniformly sampled range configured separately for each die type. Better and Worse use the same range; Off keeps the original result. The default is the entire die range.
- Preserves the existing Full Control, Bias and Threshold modes, affected-die selection, and physical Pixels d20 bypass.
- Range mode does not emit this module's manipulation notices, debug roll metadata or special Dice So Nice colors. Rerolls shed inherited manipulation metadata without changing the old roll. A narrow range can still be noticed statistically; this is not a guarantee of secrecy from client inspection.
- Includes the gold d20 emblem, compact 158px widget, native close/show controls and macro API. Yulong Homebrew is no longer required. Its former macro aliases remain available for compatibility.

## Use

GM: choose Range in the strategy selector, then open Dice Settings and configure the inclusive minimum/maximum for each die. Both endpoints must be whole numbers within that die's faces. Equal endpoints force one value. Invalid ranges are rejected before settings are saved.

The former `nudge` setting ID is retained only as a storage-compatible slot for Range; the old nudging algorithm is removed. Old nudge amounts are not converted into arbitrary ranges.

Native macro API: `game.modules.get("fumble-switch").api.showWidget()`, `.hideWidget()` and `.toggleWidget()`. Existing `window.yulongHomebrew.showFumbleSwitchWidget`, `hideFumbleSwitchWidget` and `toggleFumbleSwitchWidget` calls remain supported by this plugin itself.

## Manual installation and update lock

Back up the current module, extract the release ZIP into `Data/modules/fumble-switch`, and enable the module as usual. The ZIP contains `module.json` at its root. This edition intentionally omits upstream `manifest` and `download` URLs; install from the ZIP, not the upstream manifest.

Version 99.0 and `fumble-switch.lock` protect this edition from the normal Foundry Setup update workflow. Foundry must reread package information before its cached lock state changes. The lock does not prevent an administrator from explicitly unlocking or replacing files.

## Validation

`node --check fumble-switch.js` and `node tests/range-integration.cjs` cover sampling, interval validation, state selection, legacy settings, Pixels bypass, reroll metadata, delayed notifications and other-mode regression behavior. The compact widget was also checked in an isolated Chromium harness. No live world or multi-client acceptance test was performed for this release.
