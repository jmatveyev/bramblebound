# BRAMBLEBOUND 1.1 Touch Edition - verification record

Date: 2026-09-07

## Build identity

- Self-contained HTML: 209,378 bytes.
- SHA-256: `f8693ac6b5d52e2f0c01ca8f2774803a2e1934c62ebcad7c98ceaba2cc23c51c`
- The supplied source rebuilds this HTML byte-for-byte with standard-library Python.
- `index.html`, `bramblebound.html`, and the delivered `bramblebound-mobile.html`
  are byte-identical.

## Results

**279 game/browser assertions passed**, with zero failed assertions in the final
reports. No uncaught JavaScript exceptions were recorded in those successful
runs. Successful runs also recorded no graphics/JavaScript console warnings.

| Suite | Passed | Scope |
|---|---:|---|
| Original isolated core mechanics | 63 | Movement, combat, puzzles, progression, saves, and recovery |
| Original continuous story route | 23 | Fresh story to ending with ordinary gameplay inputs |
| Original UI/capability regressions | 39 | Desktop input, graphics fallbacks, settings, storage handling, and more |
| Phone controls and layouts | 117 | Actual browser-dispatched touch events, multi-touch, UI, saves, and seven viewports |
| Touch-handler continuous story route | 23 | Whole story using joystick/action touch handlers |
| Optional mobile API fallbacks | 14 | Fullscreen, sharing, clipboard, and editable save-code handling |

There are also **5 separate delivery checks** for the optional local HTTP server.
They verify bytes, content type, HEAD behavior, source-path rejection, and an
empty favicon response. They are not mobile gameplay or phone-network tests.

Counts describe assertions, including repeated layout checks, not independent
human play sessions or a guarantee of defect-free software.

## Actual test environment

Chromium 144 on Linux, driven by Python Playwright under Xvfb, with ANGLE /
SwiftShader software rendering. Mobile contexts enable touch, mobile viewport
behavior, and a device pixel ratio of 3 for the dedicated touch suite.

The environment blocks browser navigation to file and local-server URLs with
`ERR_BLOCKED_BY_ADMINISTRATOR`. The complete HTML was therefore executed via
Playwright `set_content` in about:blank. Its real game scripts, WebGL shaders,
UI, collision logic, and event handlers ran; the game's code was not replaced
with a mock implementation.

The HTTP helper itself was checked separately with Python urllib on loopback.
That does not prove browser launch, firewall configuration, LAN access from a
phone, or a production host's headers and content policies.

**Not verified:** physical iPhones or Android phones, Safari, Chrome running on
Android, mobile GPU drivers, battery use, thermal throttling, actual frame rates,
OS keyboard behavior, native share sheets, app-switcher termination, direct
file launching, and persistence through a real browser/device restart.

An attempt to obtain a WebKit test runtime failed because the download host
could not be resolved in this environment. There are no WebKit/Safari results.
The intended mobile targets are current Safari and Chrome installations with
working WebGL 2 and pointer events, not all phones or all embedded webviews.

## Dedicated touch coverage: 117 checks

The suite uses Chrome DevTools Protocol touchStart/touchMove/touchEnd/touchCancel
inputs. Joystick and button checks are not mouse events disguised as touches.
Browser-native taps and actual finger-movement sequences exercise scrolling.

Covered scenarios include:

- Automatic controls, phone graphics defaults, pixel budget, and no mouse lock.
- Analog movement, center deadzone, walking, sprinting at the rim, and stopping.
- Two-thumb move/jump, variable jump height, and unlocked air jumping.
- Fast blade taps, hold/release spin, charge feedback, simultaneous action owners,
  and releasing one finger without cancelling another finger's held action.
- Touch cancellation clearing charge without an accidental spin attack.
- Roll, returning ring, drag-to-turn camera while moving, pinch zoom without
  page zoom, and camera reset.
- Actual crate pushing onto the workshop plate, chest/reward interaction,
  dialogue pages, shop purchase, rotating a prism, atlas hints, and exits.
- Pause/resume, touch-off recovery, camera sensitivity, orientation changes,
  blur, pagehide, visibility changes, input reset, and audio suspend handling.
- Real downloaded JSON export, importing that file through the page's file-input
  interface, pasted-code restore, rejecting invalid codes without changing the
  story, and no-storage messaging.
- Seven viewport sizes: 320x568, 360x640, 390x844, 430x932, 667x375, 844x390,
  and 1024x768. Checks cover at least 44 CSS-pixel main targets, non-overlapping
  controls, viewport fit, no page horizontal overflow, swipe-scrolling settings,
  and reachable Back/Close buttons.
- Explicit safe-area simulation for a landscape notch and home indicator.
- Network requests and runtime/console errors.

Isolated tests stage player positions, currencies, and ability prerequisites to
exercise individual mechanics. Those are not represented as unaided playthroughs.
Viewport emulation and simulated safe-area values do not recreate an iPhone's
operating system, browser chrome, graphics driver, or physical screen.

The downloadable JSON test captures a real browser download. The file-input test
supplies a file through Playwright, not the operating system's native picker.

## Complete touch-handler route: 23 checks

A fresh story reaches the ending through the workshop, Brookfall, Sunstep,
Moonroot, and the final guardian. It physically pushes the crate, opens the ring
chest, crosses platforms, activates targets, rides moving platforms, obtains
abilities, destroys thorns, rotates prisms, and defeats all three boss phases.
The recorded route had zero falls and zero faints.

This route dispatches DOM PointerEvents to the actual joystick/action handlers
and uses button clicks to advance menus. It uses state-aware navigation and
fixed simulation steps, not an OS-level robot touching a screen. It does not
teleport the player, set ability/objective flags, apply direct damage, enable
invulnerability, or skip puzzles. A waypoint routes around the western arch's
sign, as an ordinary player can. The separate dedicated suite verifies actual
browser-dispatched multi-touch events for individual actions.

The route establishes reachability and mechanical completion with touch
handlers, not human enjoyment, accessibility, game balance, or consumer-device
performance. Automated completion time is not a human playtime estimate.

## Optional browser capabilities: 14 checks

Fullscreen unavailable/denied states show readable messages and keep normal-tab
play available. Share is offered only when canShare reports file support.
Injected share success, cancellation, and rejection exercise the game handlers;
they do not open or validate a real mobile share sheet.

Clipboard success and failure are injected. The manual fallback leaves the
entire portable-save code selected. Save-code editing does not send the typed
letters to game controls. Real permissions and OS text-selection UI remain
unverified.

## Original regressions and limitations

The original 63 isolated core assertions and 39 UI/capability checks were rerun
on this build. Some use diagnostic placement, simulated gamepad data, injected
graphics failures, and a storage substitute. The original 23-check uninterrupted
story route also passed again, independently of the new touch-handler route.

about:blank storage is unavailable here. The tests validate serialization,
import/export, recovery logic, and unavailable-storage behavior, not reliable
persistence for every file origin or across actual device restarts. Exported
save backups remain important.

Audio-related code executed without observed runtime errors. Sound quality was
not auditioned on phone speakers. There has been no independent accessibility
or photosensitivity assessment.

## Visual inspection

Portrait and landscape game screens, safe-area layouts, and scrolling menus
were rendered and inspected. The Brookfall preview stages location and progress
using diagnostics, then runs the real game renderer. It is a screenshot of the
game, not concept art or an image-generation mockup.

## Reproduction

Build both distributed entry points:

    python3 source/build.py
    python3 source/build.py --output index.html

Original suites:

    python3 tests/run_core.py
    python3 tests/run_route.py
    python3 tests/additional.py

Mobile suites:

    xvfb-run -a python3 tests/mobile.py
    python3 tests/run_touch_route.py
    xvfb-run -a python3 tests/mobile_capabilities.py

Tests require Python Playwright, /usr/bin/chromium, and Xvfb. Inspect the JSON
reports for failed assertions; the scripts are diagnostic tools, not a complete
cross-browser certification system. The #qa URL fragment exposes helpers only
for development; normal play does not use them.
