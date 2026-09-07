// Touch input is owned by individual pointers. Menu transitions invalidate every owner.
// Rendering and the fixed-step game use the same actions as keyboard play.
let touchEnabled = false, touchRunning = false, stickID = null;
const stick = $('stick'), knob = $('knob');
const actionPointers = new Map(), cameraPointers = new Map();
let pinchSpan = 0, viewportLandscape = innerWidth > innerHeight, viewportRequest = 0;
let saveToolsReturn = 'menu';

function resetTouchInputs() {
  const captured = [...actionPointers.entries()];
  actionPointers.clear();
  cameraPointers.clear();
  pinchSpan = 0;
  const oldStick = stickID;
  stickID = null;
  touchRunning = false;
  touchVector.x = touchVector.y = 0;
  if (knob) knob.style.transform = '';
  if (stick) {
    stick.classList.remove('running');
    try { if (oldStick !== null && stick.hasPointerCapture(oldStick)) stick.releasePointerCapture(oldStick); } catch (_) {}
  }
  for (const [id, owner] of captured) {
    owner.element.classList.remove('held');
    try { if (owner.element.hasPointerCapture(id)) owner.element.releasePointerCapture(id); } catch (_) {}
  }
}

function controlText(text) {
  if (!touchEnabled || typeof text !== 'string') return text;
  const exact = new Map([
    ['WASD to wander. Space to jump. Find Moss by the well and press E.', 'Drag the left stick to move; its outer rim runs. Tap Jump to leap. Find Moss by the well and tap Talk.'],
    ['Welcome back. Tab opens your map and journal.', 'Welcome back. Tap the atlas button at the top right for your map and journal.'],
    ['Stand just south of the crate (between it and the sign). Hold E and W to push it north onto the brass circle. The open gate is to its right.', 'Stand south of the crate, between it and the sign. Hold Push while moving the left stick north to slide it onto the brass circle. The open gate is to its right.'],
    ['Hold E + move to push', 'Hold Push + move to push'],
    ['Tab: map and journal. Golden arches lead to the next part of your story.', 'Tap the atlas button for your map and journal. Golden arches lead to the next part of your story.']
  ]);
  if (exact.has(text)) return exact.get(text);
  return text
    .replace(/WASD or arrows/g, 'the left stick')
    .replace(/WASD/g, 'the left stick')
    .replace(/Hold E and W/g, 'Hold Push and move north')
    .replace(/Hold E/gi, 'Hold Use')
    .replace(/Keep E held/g, 'Keep Use held')
    .replace(/Press Space again/gi, 'Tap Jump again')
    .replace(/Press Space/gi, 'Tap Jump')
    .replace(/Space to jump/g, 'Jump to leap')
    .replace(/press E/gi, 'tap Use')
    .replace(/Each press of E/g, 'Each tap of Use')
    .replace(/with E\b/g, 'with Use')
    .replace(/hold J/gi, 'hold Blade')
    .replace(/press Q/gi, 'tap Ring')
    .replace(/throw Q\b/gi, 'tap Ring')
    .replace(/with Q\b/g, 'with Ring')
    .replace(/\(Tab\)/g, '(atlas button)')
    .replace(/\bTab\b/g, 'the atlas button');
}

function setTouch() {
  const next = settings.touch === 'on' || settings.touch === 'auto' &&
    (navigator.maxTouchPoints > 0 || matchMedia('(any-pointer:coarse)').matches);
  if (next !== touchEnabled) clearInput();
  touchEnabled = next;
  document.body.classList.toggle('touch-on', next);
  // A touch-only device must not get stranded by accidentally selecting Off.
  $('touchRescue').classList.toggle('available', !next && navigator.maxTouchPoints > 0);
  if (typeof gameStarted !== 'undefined' && gameStarted) updateObjective();
}

function updateStick(e) {
  const r = stick.getBoundingClientRect(), max = r.width * .37;
  let dx = (e.clientX - r.left - r.width / 2) / max;
  let dy = (e.clientY - r.top - r.height / 2) / max;
  const length = Math.hypot(dx, dy), magnitude = Math.min(1, length);
  // Hysteresis keeps running from flickering at the thumb's outer travel limit.
  touchRunning = touchRunning ? magnitude > .85 : magnitude > .94;
  const output = magnitude < .12 ? 0 : (magnitude - .12) / .88;
  touchVector.x = length ? dx / length * output : 0;
  touchVector.y = length ? dy / length * output : 0;
  knob.style.transform = `translate(${length ? dx / length * magnitude * max : 0}px,${length ? dy / length * magnitude * max : 0}px)`;
  stick.classList.toggle('running', touchRunning);
  $('stickCaption').textContent = touchRunning ? 'RUNNING' : 'MOVE / OUTER RIM TO RUN';
}

stick.addEventListener('pointerdown', e => {
  if (state !== 'playing' || stickID !== null) return;
  e.preventDefault();
  stickID = e.pointerId;
  try { stick.setPointerCapture(e.pointerId); } catch (_) {}
  inputSource = 'touch';
  updateStick(e);
  AudioSys.start();
});
stick.addEventListener('pointermove', e => {
  if (e.pointerId === stickID && state === 'playing') { e.preventDefault(); updateStick(e); }
});
function releaseStick(e) {
  if (e.pointerId !== stickID) return;
  stickID = null;
  touchRunning = false;
  touchVector.x = touchVector.y = 0;
  knob.style.transform = '';
  stick.classList.remove('running');
  $('stickCaption').textContent = 'MOVE / OUTER RIM TO RUN';
}
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(name, releaseStick);

function releaseAction(e) {
  const owner = actionPointers.get(e.pointerId);
  if (!owner) return;
  actionPointers.delete(e.pointerId);
  if (![...actionPointers.values()].some(v => v.code === owner.code)) {
    owner.element.classList.remove('held');
    // Cancellation is not an intentional release: never fire a stored spin on an interruption.
    if (e.type !== 'pointerup') {
      held.delete(owner.code);
      pressed.delete(owner.code);
      released.delete(owner.code);
      if (owner.code === 'KeyJ') { player.charge = 0; player.spinConsumed = false; }
    } else routeButton(owner.code, false);
  }
}
for (const b of document.querySelectorAll('.touchbtn[data-action]')) {
  b.addEventListener('pointerdown', e => {
    if (state !== 'playing' || b.disabled) return;
    e.preventDefault();
    const code = b.dataset.action;
    const alreadyHeld = [...actionPointers.values()].some(v => v.code === code);
    actionPointers.set(e.pointerId, {code, element: b});
    try { b.setPointerCapture(e.pointerId); } catch (_) {}
    inputSource = 'touch';
    b.classList.add('held');
    if (!alreadyHeld) routeButton(code, true);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(name, releaseAction);
  b.addEventListener('contextmenu', e => e.preventDefault());
}
// The canvas owns camera gestures only; a joystick finger can never become a camera finger.
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch' || state !== 'playing') return;
  e.preventDefault();
  cameraPointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  pinchSpan = cameraPointers.size === 2 ? cameraSpan() : 0;
  inputSource = 'touch';
  AudioSys.start();
});
function cameraSpan() {
  const p = [...cameraPointers.values()];
  return p.length >= 2 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
}
canvas.addEventListener('pointermove', e => {
  const previous = cameraPointers.get(e.pointerId);
  if (!previous || state !== 'playing') return;
  e.preventDefault();
  const dx = e.clientX - previous.x;
  cameraPointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
  if (cameraPointers.size === 1) cameraState.yaw -= dx * .006 * settings.lookSensitivity;
  else if (cameraPointers.size === 2) {
    const span = cameraSpan();
    if (pinchSpan > 8 && span > 8) cameraState.distance = clamp(cameraState.distance * pinchSpan / span, 13, 26);
    pinchSpan = span;
  }
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, e => {
  cameraPointers.delete(e.pointerId);
  pinchSpan = cameraPointers.size === 2 ? cameraSpan() : 0;
});
$('touchCenter').onclick = () => {
  if (state !== 'playing') return;
  cameraState.yaw = 0;
  cameraState.distance = 19;
  toast('Camera facing north. Drag the view to turn; pinch to zoom.', 3);
};
$('touchRescue').onclick = () => {
  settings.touch = 'on';
  setTouch();
  saveJSON('bramblebound-settings', settings);
};

function updateTouchHUD() {
  if (!touchEnabled) return;
  const ring = $('touchRing'), blade = $('touchBlade'), use = $('touchUse');
  ring.disabled = !D.ring;
  ring.setAttribute('aria-label', D.ring ? 'Throw sunring' : 'Sunring not found yet');
  ring.classList.toggle('cooldown', !!sunring || player.ringCD > 0);
  blade.style.setProperty('--charge', Math.min(1, player.charge / .55) * 360 + 'deg');
  blade.classList.toggle('charged', player.charge >= .55);
  $('bladeCaption').textContent = player.charge >= .55 ? 'RELEASE' : 'HOLD: SPIN';
  const verbs = {npc: near?.o?.id === 'toma' ? 'Shop' : 'Talk', chest: 'Open', bell: 'Chime', portal: 'Travel', prism: 'Turn', crate: 'Push', lantern: 'Rest'};
  $('useCaption').textContent = near ? verbs[near.type] || 'Use' : 'Use';
  use.setAttribute('aria-label', near ? controlText(near.label) : 'Interact');
  use.classList.toggle('ready', !!near);
  document.body.classList.toggle('boss-active', !!boss?.awakened && !D.won);
}

function syncViewport() {
  const vv = window.visualViewport;
  const height = vv && Math.abs(vv.scale - 1) < .01 ? vv.height : innerHeight;
  document.documentElement.style.setProperty('--app-height', Math.round(height) + 'px');
  const landscape = innerWidth > innerHeight;
  if (touchEnabled && landscape !== viewportLandscape) {
    clearInput();
    if (state === 'playing') pauseGame();
  }
  viewportLandscape = landscape;
  cancelAnimationFrame(viewportRequest);
  viewportRequest = requestAnimationFrame(() => {
    if (Support.isFailed()) return;
    try { Engine.resize(); } catch (e) { Support.fail(e); }
  });
}
window.addEventListener('resize', syncViewport);
if (window.visualViewport) window.visualViewport.addEventListener('resize', syncViewport);
window.addEventListener('orientationchange', () => {
  if (touchEnabled) { clearInput(); if (state === 'playing') pauseGame(); }
  syncViewport();
});
window.addEventListener('pagehide', () => {
  clearInput();
  if (state === 'playing') pauseGame();
  else if (gameStarted) saveGame();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInput();
    if (gameStarted) saveGame();
    const ctx = AudioSys.context;
    if (ctx?.state === 'running') ctx.suspend().catch(() => {});
  }
});
// A user gesture is required for audio recovery on mobile browsers.
document.addEventListener('pointerdown', () => { if (gameStarted) AudioSys.start(); }, {capture: true, passive: true});

function openSaveTools(mode = 'export') {
  saveToolsReturn = state === 'ending' ? 'ending' : state === 'paused' ? 'paused' : 'menu';
  if (gameStarted) saveGame();
  state = 'saveTools';
  clearInput();
  showScreen('saveTools');
  const exporting = mode === 'export';
  $('saveToolsTitle').textContent = exporting ? 'Take your story with you.' : 'Bring your story back.';
  $('saveCode').readOnly = exporting;
  $('saveCode').value = exporting ? JSON.stringify(D) : '';
  $('saveCode').placeholder = 'Paste your Bramblebound save code here.';
  $('saveExportActions').classList.toggle('hidden', !exporting);
  $('saveImportCode').classList.toggle('hidden', exporting);
  $('saveToolsStatus').textContent = exporting ? 'Download the JSON file, share it, or copy the code. Keep a copy outside this browser.' : 'Restoring a valid code replaces the story saved in this browser. Your exported files are not changed.';
  let canShare = false;
  try { canShare = exporting && !!navigator.canShare?.({files: [new File([$('saveCode').value], 'bramblebound-save.json', {type: 'application/json'})]}); } catch (_) {}
  $('saveShare').classList.toggle('hidden', !canShare);
}
function closeSaveTools() {
  clearInput();
  if (saveToolsReturn === 'paused') { state = 'paused'; showScreen('pause'); }
  else if (saveToolsReturn === 'ending') { state = 'ending'; showScreen('ending'); }
  else showMenu();
}
$('saveToolsBack').onclick = closeSaveTools;
$('menuPaste').onclick = () => openSaveTools('import');
$('pauseImportCode').onclick = () => openSaveTools('import');
$('saveDownload').onclick = () => {
  downloadText('bramblebound-save.json', $('saveCode').value);
  $('saveToolsStatus').textContent = 'Download requested. Keep the JSON file in Files or Downloads. The code below is an alternative backup.';
};
$('saveCopy').onclick = async () => {
  const text = $('saveCode').value;
  let copied = false;
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); copied = true; } } catch (_) {}
  if (!copied) {
    $('saveCode').focus();
    $('saveCode').select();
    $('saveCode').setSelectionRange(0, text.length);
    try { copied = document.execCommand('copy'); } catch (_) {}
  }
  $('saveToolsStatus').textContent = copied ? 'Save code copied. Paste it into a note or message to keep it.' : 'Automatic copy is unavailable. Select the code below, then use your browser\'s Copy command.';
};
$('saveShare').onclick = async () => {
  try {
    const file = new File([$('saveCode').value], 'bramblebound-save.json', {type: 'application/json'});
    await navigator.share({files: [file], title: 'Bramblebound save'});
    $('saveToolsStatus').textContent = 'Your save was handed to the selected share destination.';
  } catch (e) {
    $('saveToolsStatus').textContent = e.name === 'AbortError' ? 'Share cancelled. Your story is unchanged.' : 'Sharing is unavailable here. Use Download JSON or Copy code instead.';
  }
};
$('saveImportCode').onclick = () => {
  try {
    const raw = $('saveCode').value;
    if (raw.length > 400000) throw Error('Save code is too large.');
    const data = validateSave(JSON.parse(raw));
    savedData = data;
    saveJSON(SAVE_KEY, data);
    continueGame();
  } catch (e) {
    $('saveToolsStatus').textContent = 'Could not restore that code: ' + e.message + ' Your current story has not been changed.';
  }
};
$('lookSensitivity').oninput = () => settings.lookSensitivity = +$('lookSensitivity').value / 100;
syncViewport();

$('prompt').onclick=()=>{if(touchEnabled&&state==='playing'){routeButton('KeyE',true);routeButton('KeyE',false);}};
