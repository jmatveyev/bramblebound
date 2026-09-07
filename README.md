# BRAMBLEBOUND: The Sleeping Sun
## 1.1 - Touch Edition

The same complete woodland adventure, revised for touch-only play on phones
and tablets. All gameplay actions have touch controls. Keyboard/mouse controls
remain available on computers. This is not a claim that every phone, browser,
or graphics driver has been verified. See TESTING.md.

## GitHub layout

The repository-ready package includes `docs/index.html` for an isolated GitHub
Pages publishing folder. See [GITHUB_SETUP.md](GITHUB_SETUP.md) for repository
creation, upload, and optional phone-accessible hosting. Packaging alone does
not create a repository or a live website.

Run `python3 build_site.py` after source edits to update the standalone, root,
and GitHub Pages copies together. No open-source license was selected.

## Playing on a phone

The intended phone launch is a normal website URL in Safari or Chrome, not a
preview of a downloaded HTML attachment. This package has not been published to
a public URL. Use one of these delivery routes:

**Website:** Publish the included `index.html` through a static HTTPS web host,
then open that site's URL on the phone. No build, backend, account inside the
game, external assets, or game server is needed. The separate website ZIP has
only `index.html` at its root and is ready for a static-file upload.

**Local development:** On a computer with Python 3, run `python3 serve.py --lan`
from this package. On the same trusted Wi-Fi network, open
`http://YOUR-COMPUTER-LAN-IP:8000` on the phone. The computer's firewall must allow
that connection. Stop the server with Ctrl+C when finished. This serves only the
game file; it does not publish the game to the internet. It is not a production
server. Without HTTPS, some clipboard/share features can be unavailable; the
game includes download and manual-copy alternatives.

**Desktop:** Open `bramblebound.html` in a normal browser tab, not an attachment
preview. WebGL 2 is required. Direct file launching was not independently
verified in the test environment.

On iPhone, after opening the hosted website in Safari, Share > Add to Home Screen
> Open as Web App > Add is an optional way to launch it with less browser chrome.
This is not an offline-install guarantee. The game does not install a service
worker or promise offline caching. Apple instructions:
https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios

## Touch controls

| Action | Touch control |
|---|---|
| Move | Drag the left thumb-stick; partial travel gives slower movement |
| Run | Push the stick to its outer rim |
| Jump | Tap Jump; hold for a higher leap |
| Air jump | Lift and tap Jump again after earning the ability |
| Blade | Tap Blade |
| Charged spin | Hold Blade until RELEASE appears, then lift your finger |
| Returning sunring | Tap Ring after obtaining it in the workshop |
| Evade | Tap Roll |
| Talk, open, shop, chime, travel, or turn a prism | Tap the contextual Use button |
| Push a crate | Hold Push while moving into the crate with the stick |
| Camera | Drag the unobstructed game view; pinch that view with two fingers to zoom |
| Reset camera | Tap View |
| Map, journal, and puzzle hints | Tap the diamond-shaped atlas button at the top |
| Pause, settings, saves, checkpoint recovery | Tap the pause button at the top |

The stick, actions, and camera retain independent finger ownership. Releasing
one thumb does not release an action held by another. Menus use taps and normal
vertical scrolling. The layout supports portrait and landscape, with larger
views in landscape. Touch controls appear automatically; Settings can override
this. A Restore touch controls button prevents an accidental Off selection from
stranding a touch-only player.

The game pauses and clears held controls when the page loses focus, is hidden,
or changes orientation. Resume explicitly after an interruption. Audio begins
or resumes on a user gesture. Fullscreen is optional and falls back to a normal
tab when unavailable or denied.

## A useful first minute

Walk up the village path and tap Talk near Moss, the owl. At the workshop, stand
south of the movable crate and hold Push while moving north. Push it onto the
brass plate, enter through the open gate, and open the chest. Your new sunring
opens the route through the east arch to Brookfall.

The ring stuns armored enemies and activates distant targets. Jumping on enemies
also attacks them. Lanterns heal you. Acorns buy permanent upgrades. The atlas
provides optional hints. WALKTHROUGH.md contains full story spoilers; its
keyboard names refer to the equivalent touch actions in the table above.

## Saving and moving between devices

Browser storage is used when available. Its status is shown in the pause menu.
Do not rely on a browser save as your only backup. Changing browser, website
origin, or clearing browser data can separate or remove that save.

On touch devices, Export save opens portable-save tools. Download the JSON file,
use Share save when the browser advertises support, or Copy save code to a note.
If automatic copying is blocked, the text remains selectable for manual copying.

Import a save on the title screen restores a JSON file. Paste save code on the
title screen, or Import code in the pause menu, restores copied text. A valid
import replaces the current browser story; invalid data is rejected first.
Native file pickers, share sheets, and clipboard permissions remain controlled
by the phone/browser, not by the game. An exported file is not a cloud save.

## Graphics and device limits

Touch-capable handheld layouts default to Performance graphics. Their rendering
budgets are capped at 720,000 / 1,000,000 / 1,400,000 pixels for Performance /
Balanced / High, with a 1.5 device-pixel-ratio ceiling. Desktop budgets are
unchanged. Actual frame rate, battery use, heat, and memory behavior need testing
on physical devices. Lower quality in Settings if play feels uneven.

A device still needs working WebGL 2 graphics. Safe graphics can reduce resource
use but cannot provide a missing graphics API. Native fullscreen, file sharing,
and clipboard APIs are optional; missing ones should not stop gameplay.

## Keyboard / mouse and controller

WASD or arrows move; Shift runs; Space jumps; J or left click attacks; hold and
release to spin; Q or L throws the ring; K tumbles; E interacts/pushes; Tab opens
the atlas; Escape or P pauses; right-drag turns the camera; wheel zooms.

Standard gamepad mapping is retained: left stick movement, right stick camera,
A jump, B evade, X blade, Y use, RB ring, Back atlas, Start pause. Menus use
mouse/touch. Controller hardware was not independently tested.

## Package contents and rebuilding

- `index.html`: hosting entry point, identical to the standalone game.
- `bramblebound.html`: standalone build used by the included test launchers.
- `source/`: editable source, including mobile.js and mobile.css.
- `serve.py`: optional standard-library local server for trusted-LAN testing.
- `TESTING.md`, `verification.json`: results, integrity record, and limitations.
- `tests/`: automated checks and their reports.
- `screenshots/`: actual-renderer phone layouts; some scene placement is staged.
- `WALKTHROUGH.md`: optional full-route help.

Rebuild both entry points after editing:

    python3 source/build.py
    python3 source/build.py --output index.html

No third-party packages are needed to build or serve. Tests additionally require
Python Playwright, Chromium, and Xvfb on Linux; see TESTING.md. This remains a
compact original adventure, not a claim of commercial AAA production quality.
