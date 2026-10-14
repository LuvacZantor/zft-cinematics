/**
 * ZFT Cinematics | Smooth Camera Phase 1 (Foundry V13)
 * Client-side mouse-wheel zoom easing and Photoshop-style right-mouse panning.
 *
 * Right-drag uses Foundry's unmodified native cursor-to-canvas movement.
 * No target interpolation or viewport rewinding while dragging. A quick
 * drag-and-release can optionally coast in the same direction using friction.
 * Releasing after a pause stops normally. Never applies a correction toward
 * an older native/presented camera target, which caused Dev 19/20 springing.
 */
const ID = 'zft-cinematics';
const VERSION = '0.2.0-dev.15';
const LOG = `[ZFT] 🎥 v${VERSION} | Smooth Camera`;
const OTHER_CAMERA_MODULES = ['aeris-smooth-camera', 'ez-glide'];
const EASING = {
  linear: t => t,
  easeOut: t => 1 - (1 - t) ** 3,
  easeInOut: t => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
};
const client = name => game.settings.get(ID, name);
const moduleActive = name => Boolean(game.modules.get(name)?.active);
const raf = callback => requestAnimationFrame(callback);
const clock = () => performance.now();
const settings = () => ({
  available: game.settings.get(ID, 'smoothCameraAllowed'),
  enabled: client('cameraEnabled'),
  pan: client('cameraSmoothPan'),
  momentum: client('cameraPanMomentum'),
  zoom: client('cameraSmoothZoom'),
  duration: client('cameraDuration'),
  easing: client('cameraEasing')
});
let animation = null;
let drag = false;
let coast = null;
let dragSamples = []; // Native viewport positions: fallback velocity source.
let pointerSamples = []; // Actual mouse positions: primary release-velocity source.
let pointerListening = false;
let pendingRelease = null; // Completes after Foundry's native right-button cleanup.
const POINTER_WINDOW_MS = 120;
const POINTER_MAX_AGE_MS = 140;
let installed = false;
let warnedConflict = false;
let warnedNoWrapper = false;
let installedPhase = 'not-installed';


function goodCamera(c = canvas) {
  return Boolean(c?.ready && c.stage?.pivot && c.stage?.scale && !c.loading);
}
function view(c = canvas) {
  if (!goodCamera(c)) return null;
  const { x, y } = c.stage.pivot;
  const scale = c.stage.scale.x;
  if (![x, y, scale].every(Number.isFinite) || scale <= 0) return null;
  return { x, y, scale };
}
function changes(a, b) {
  return a && b && (Math.abs(a.x - b.x) > 0.01 || Math.abs(a.y - b.y) > 0.01 || Math.abs(a.scale - b.scale) > 0.00001);
}
function noConflict() {
  const conflict = OTHER_CAMERA_MODULES.find(moduleActive);
  if (conflict && !warnedConflict) {
    warnedConflict = true;
    console.warn(`${LOG} ⚠️ | Camera smoothing suspended to avoid competing with ${conflict}`);
    if (game.user?.isGM) ui.notifications?.warn(`ZFT Cinematics: Smooth Camera paused while ${conflict} is enabled.`);
  }
  return !conflict;
}
function enabled(which) {
  const s = settings();
  return s.available && s.enabled && Boolean(s[which]) && noConflict();
}
function stop() {
  if (pendingRelease) {
    cancelAnimationFrame(pendingRelease.frame);
    pendingRelease = null;
  }
  if (animation) {
    cancelAnimationFrame(animation.frame);
    animation = null;
  }
  if (coast) {
    cancelAnimationFrame(coast.frame);
    coast = null;
  }
}
function apply(c, v) {
  // Canvas.pan() is the supported V13 entry point for constrained viewport
  // changes. The animation never mutates the stage transform directly.
  c.pan({ x: v.x, y: v.y, scale: v.scale });
}
function animateTo(c, destination, duration = settings().duration, easing = settings().easing) {
  const initial = view(c);
  if (!initial || !changes(initial, destination)) return false;
  stop();
  const scene = c.scene?.id;
  const started = clock();
  const time = Math.max(100, Math.min(1000, Number(duration) || 500));
  const ease = EASING[easing] ?? EASING.easeOut;
  const current = { frame: 0, scene, target: { ...destination } };
  animation = current;
  const tick = now => {
    if (animation !== current) return;
    if (!goodCamera(c) || c.scene?.id !== current.scene || drag || !settings().available || !settings().enabled) {
      stop();
      return;
    }
    const t = Math.min(1, Math.max(0, (now - started) / time));
    const factor = ease(t);
    apply(c, {
      x: initial.x + (destination.x - initial.x) * factor,
      y: initial.y + (destination.y - initial.y) * factor,
      scale: initial.scale + (destination.scale - initial.scale) * factor
    });
    if (t < 1) current.frame = raf(tick);
    else animation = null;
  };
  current.frame = raf(tick);
  return true;
}

/** Wrap native wheel handling; keep native wheel step size, anchor and event routing. */
function wheel(wrapped, event) {
  if (!enabled('zoom') || !goodCamera(this) || drag) {
    stop();
    return wrapped(event);
  }
  const c = this;
  const before = view(c);
  if (!before) return wrapped(event);
  // Compute subsequent scroll steps from the intended zoom target, rather than
  // an intermediate frame, so rapid wheel events don't lose zoom distance.
  const queued = animation?.scene === c.scene?.id ? animation.target : null;
  if (queued) apply(c, queued);
  let result;
  try {
    result = wrapped(event);
  } catch (error) {
    apply(c, before);
    throw error;
  }
  const target = view(c);
  // Restore before the next paint, then animate toward the target. If Foundry
  // ignored the wheel event, no extra camera movement is performed.
  apply(c, before);
  if (changes(queued ?? before, target)) {
    animateTo(c, target);
  } else if (queued) {
    // A new wheel event may have been ignored (e.g., at maximum zoom), but
    // the previous animation must still finish instead of jumping to its end.
    animateTo(c, queued);
  }
  return result;
}

/**
 * Observe the physical right-mouse gesture, separate from the timing of
 * Canvas._onDragRightMove. Foundry V13 may apply its viewport changes after
 * that callback returns, so a callback-sampled pivot can be unchanged even
 * though the player has moved the mouse several hundred pixels.
 *
 * These listeners never preventDefault, move the camera, or touch the stage.
 */
function samplePointer(event) {
  if (!drag || !event) return;
  if (typeof event.buttons === 'number' && (event.buttons & 2) === 0) return;
  if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
  const x = Number(event.clientX), y = Number(event.clientY), at = clock();
  const prev = pointerSamples.at(-1);
  if (prev && Math.hypot(x - prev.x, y - prev.y) < 0.5) return;
  pointerSamples.push({ x, y, at });
  pointerSamples = pointerSamples.filter(p => at - p.at <= POINTER_WINDOW_MS).slice(-20);
}
function captureNativePointer(...args) {
  const evt = args[0];
  const candidates = [evt?.data?.originalEvent, evt?.nativeEvent, evt?.originalEvent, evt?.srcEvent, evt];
  for (const candidate of candidates) {
    if (Number.isFinite(candidate?.clientX) && Number.isFinite(candidate?.clientY)) {
      samplePointer(candidate);
      break;
    }
  }
}
function listenPointer() {
  if (pointerListening) return;
  window.addEventListener('pointermove', samplePointer, true);
  window.addEventListener('mousemove', samplePointer, true);
  // PIXI and browser dispatch do not always share the same drop callback.
  // Capture the physical right-button release, without interfering with it.
  window.addEventListener('pointerup', onBrowserRightRelease, true);
  window.addEventListener('mouseup', onBrowserRightRelease, true);
  window.addEventListener('blur', onWindowBlur, true);
  pointerListening = true;
}
function unlistenPointer() {
  if (!pointerListening) return;
  window.removeEventListener('pointermove', samplePointer, true);
  window.removeEventListener('mousemove', samplePointer, true);
  window.removeEventListener('pointerup', onBrowserRightRelease, true);
  window.removeEventListener('mouseup', onBrowserRightRelease, true);
  window.removeEventListener('blur', onWindowBlur, true);
  pointerListening = false;
}
function velocityFromPointer(c) {
  if (pointerSamples.length < 2) return null;
  const last = pointerSamples.at(-1);
  if (clock() - last.at > POINTER_MAX_AGE_MS) return null;
  const first = [...pointerSamples].reverse().find(p => p.at <= last.at - 40)
    ?? pointerSamples[0];
  const elapsed = last.at - first.at;
  if (elapsed < 8) return null;
  const dx = last.x - first.x, dy = last.y - first.y;
  const screenSpeed = Math.hypot(dx, dy) / elapsed;
  if (screenSpeed < 0.22) return { x: 0, y: 0, source: 'pointer', reason: 'Release too slow' };
  // Foundry pivots the world in the opposite direction to the screen drag.
  // Convert screen px/ms to canvas/world units/ms using the current zoom.
  const scale = view(c)?.scale ?? 1;
  return { x: -dx / elapsed / scale, y: -dy / elapsed / scale, source: 'pointer' };
}

/**
 * A DOM-level right-button release is the source of truth for an actual
 * physical throw. V13's private _onDragRightDrop is still wrapped, but
 * may be skipped by the internal interaction manager on some workflows.
 *
 * Schedule the throw for the next frame so native PIXI input processing has
 * completed. Never move, rewind, or override the canvas while dragging.
 */
function queueRelease(c, event, origin) {
  if (!drag || pendingRelease) return;
  // A mouse-up event has buttons=0: don't require button bit 2 to capture it.
  if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
    const p = pointerSamples.at(-1), at = clock();
    if (!p || Math.hypot(p.x - event.clientX, p.y - event.clientY) > 1) {
      pointerSamples.push({ x: event.clientX, y: event.clientY, at });
      pointerSamples = pointerSamples.filter(x => at - x.at <= POINTER_WINDOW_MS).slice(-20);
    }
  }
  const doThrow = enabled('pan') && settings().momentum && goodCamera(c);
  const velocity = doThrow ? flickVelocity(c) : { x: 0, y: 0, reason: 'Throw disabled or camera unavailable' };
  const release = { frame: 0, scene: c.scene?.id, velocity, canThrow: doThrow };
  pendingRelease = release;
  unlistenPointer();
  // IMPORTANT: drag remains true until the next frame to avoid interfering
  // with native _onDragRightDrop/_onDragRightCancel on the same event.
  release.frame = raf(() => {
    if (pendingRelease !== release) return;
    pendingRelease = null;
    drag = false;
    dragSamples = [];
    pointerSamples = [];
    if (release.canThrow && goodCamera(c) && c.scene?.id === release.scene) {
      throwPan(c, velocity);
    }
  });
}
function onBrowserRightRelease(event) {
  if (!drag || pendingRelease || event?.button !== 2) return;
  queueRelease(canvas, event, 'browser');
}
function onWindowBlur() {
  if (!drag && !pendingRelease) return;
  drag = false;
  unlistenPointer();
  pointerSamples = [];
  dragSamples = [];
  stop();
}

/**
 * Samples are the ACTUAL view after Foundry performs native right-drag.
 * We never restore a lagging view or modify a dragging camera ourselves.
 */
function sampleRightDrag(c) {
  const current = view(c);
  if (!current) return;
  const now = clock();
  const previous = dragSamples.at(-1);
  if (previous && Math.hypot(current.x - previous.x, current.y - previous.y) < 0.01) return;
  dragSamples.push({ x: current.x, y: current.y, at: now });
  dragSamples = dragSamples.filter(p => now - p.at <= 140).slice(-16);
}

/** World units per millisecond, using real mouse-derived pan samples. */
function flickVelocity(c) {
  const pointer = velocityFromPointer(c);
  if (pointer) return pointer;
  if (dragSamples.length < 2) return { x: 0, y: 0, reason: 'No recent drag movement captured' };
  const last = dragSamples.at(-1);
  if (clock() - last.at > 100) return { x: 0, y: 0, reason: 'Released after pausing' };
  const sample = [...dragSamples].reverse().find(p => p.at <= last.at - 30)
    ?? dragSamples[0];
  const elapsed = last.at - sample.at;
  if (elapsed < 10) return { x: 0, y: 0, reason: 'Insufficient movement interval' };
  return {
    x: (last.x - sample.x) / elapsed,
    y: (last.y - sample.y) / elapsed,
    source: 'viewport'
  };
}

/**
 * Release-only momentum. Exponential drag/friction decreases velocity each
 * frame and integrates the distance traveled. It never animates toward a
 * target set before release and never changes direction of its own accord.
 * Foundry's own canvas.pan() continues enforcing scene bounds.
 */
function throwPan(c, velocity) {
  const source = view(c);
  if (!source || !goodCamera(c)) return;
  const preferences = settings();
  const scene = c.scene?.id;
  const duration = Math.max(100, Math.min(1000, Number(preferences.duration) || 500));
  const tau = Math.max(35, duration / 3);
  const width = c.app?.renderer?.screen?.width ?? window.innerWidth ?? 1200;
  const maxDist = Math.max(90, width * 0.42) / source.scale;
  const maxVelocity = maxDist / tau;
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed < 0.05) return;
  const cap = Math.min(1, maxVelocity / speed);
  const motion = {
    scene, xVelocity: velocity.x * cap, yVelocity: velocity.y * cap,
    traveled: 0, elapsed: 0, frame: 0, lastFrame: clock()
  };
  coast = motion;
  const tick = now => {
    if (coast !== motion) return;
    if (drag || !goodCamera(c) || c.scene?.id !== scene || !enabled('pan') || !settings().momentum) {
      stop();
      return;
    }
    const dt = Math.max(1, Math.min(64, now - motion.lastFrame));
    motion.lastFrame = now;
    motion.elapsed += dt;
    const decay = Math.exp(-dt / tau);
    // Exact displacement integral for velocity exponentially decaying in time.
    const deltaX = motion.xVelocity * tau * (1 - decay);
    const deltaY = motion.yVelocity * tau * (1 - decay);
    const from = view(c);
    if (!from) return stop();
    const intendedDistance = Math.hypot(deltaX, deltaY);
    if (intendedDistance < 0.01) return stop();
    apply(c, { x: from.x + deltaX, y: from.y + deltaY, scale: from.scale });
    const actual = view(c);
    if (!actual) return stop();
    const movedX = actual.x - from.x, movedY = actual.y - from.y;
    const moved = Math.hypot(movedX, movedY);
    motion.traveled += moved;
    // Scene boundaries or competing camera control: do not pull backward.
    if ((moved < intendedDistance * 0.55) ||
        movedX * deltaX + movedY * deltaY < 0) return stop();
    if (motion.traveled >= maxDist || motion.elapsed >= duration * 1.7) return stop();
    motion.xVelocity *= decay;
    motion.yVelocity *= decay;
    if (Math.hypot(motion.xVelocity, motion.yVelocity) < 0.015) return stop();
    motion.frame = raf(tick);
  };
  motion.frame = raf(tick);
}

function dragStart(wrapped, ...args) {
  stop(); // a new drag interrupts any remaining wheel animation or coast
  dragSamples = [];
  pointerSamples = [];
  const outcome = wrapped(...args);
  drag = true;
  captureNativePointer(...args);
  listenPointer();
  return outcome;
}

function dragMove(wrapped, ...args) {
  // Let Foundry perform its complete native Photoshop-style right-drag.
  // There is intentionally NO camera manipulation while the mouse is held.
  captureNativePointer(...args);
  const outcome = wrapped(...args);
  if (drag && enabled('pan') && goodCamera(this)) sampleRightDrag(this);
  return outcome;
}

function dragEnd(wrapped, ...args) {
  captureNativePointer(...args);
  // Never start the coast before native PIXI has fully cleaned up input.
  // A DOM pointerup may already have queued this same release.
  let outcome;
  try {
    outcome = wrapped(...args);
  } finally {
    if (drag && !pendingRelease) queueRelease(this, null, 'native-drop');
  }
  return outcome;
}

function dragCancel(wrapped, ...args) {
  // V13 can invoke a cancel callback as part of input cleanup *after* the
  // physical mouseup. If a release is queued, preserve it; a true cancel
  // with no mouseup still cancels immediately.
  const wasRelease = Boolean(pendingRelease);
  if (!wasRelease) {
    drag = false;
    unlistenPointer();
    dragSamples = [];
    pointerSamples = [];
    stop();
  }
  return wrapped(...args);
}

export function registerCameraSettings() {
  game.settings.register(ID, 'smoothCameraAllowed', {
    name: 'Smooth Camera: Allow in World', scope: 'world', config: false,
    type: Boolean, default: true, onChange: value => { if (!value) stop(); }
  });
  const configs = [
    ['cameraEnabled', 'Smooth Camera: Enabled', Boolean, true],
    ['cameraSmoothPan', 'Smooth Camera: Right-Drag Throw Enabled', Boolean, true],
    ['cameraPanMomentum', 'Smooth Camera: Coast After Right-Drag Release', Boolean, true],
    ['cameraSmoothZoom', 'Smooth Camera: Smooth Wheel Zoom', Boolean, true],
    ['cameraDuration', 'Smooth Camera: Animation Duration (ms)', Number, 500],
    ['cameraEasing', 'Smooth Camera: Easing', String, 'easeOut']
  ];
  for (const [key, name, type, fallback] of configs) {
    game.settings.register(ID, key, {
      name, scope: 'client', config: false, type, default: fallback,
      onChange: () => stop()
    });
  }
}

function cameraStatus() {
  const conflict = OTHER_CAMERA_MODULES.find(moduleActive);
  const s = settings();
  let reason;
  if (!game.modules.get('lib-wrapper')?.active || typeof libWrapper === 'undefined') {
    reason = 'libWrapper is not enabled. Smoothing is inactive.';
  } else if (!installed) {
    reason = 'The camera hooks are not installed. Check the console.';
  } else if (conflict) {
    reason = `${conflict} is enabled. ZFT camera smoothing is intentionally suspended.`;
  } else if (!s.available) {
    reason = 'The GM disabled Smooth Camera for the world.';
  } else if (!s.enabled) {
    reason = 'You have disabled Smooth Camera on this client.';
  } else {
    reason = 'Hooks installed; smoothing is enabled.';
  }
  return {
    installed, registeredAt: installedPhase, active: installed && s.available && s.enabled && !conflict,
    reason
  };
}

export async function openCameraSettings() {
  const s = settings();
  const item = (key, label) => `
    <label class="zft-cinematics-toggle">
      <input name="${key}" type="checkbox" ${client(key) ? 'checked' : ''}>
      <span>${label}</span>
    </label>`;
  const content = `<div class="zft-cinematics-camera-preferences">
    <p class="hint">These settings affect <strong>only your own camera</strong>, not other players. They do not control scene transitions.</p>
    ${!s.available ? '<p class="hint">Smooth Camera is disabled in this world by the GM.</p>' : ''}
    ${item('cameraEnabled', '<strong>Enable Smooth Camera</strong>')}
    ${item('cameraSmoothZoom', 'Smooth mouse-wheel zoom')}
    ${item('cameraSmoothPan', 'Enable right-drag throw (native direct dragging)')}
    ${item('cameraPanMomentum', 'Coast when releasing while moving')}
    <div class="zft-cinematics-field">
      <label for="zft-camera-duration">Zoom animation / throw duration (ms)</label>
      <input type="number" id="zft-camera-duration" name="cameraDuration" min="100" max="1000" step="50" value="${s.duration}">
    </div>
    <div class="zft-cinematics-field">
      <label for="zft-camera-easing">Mouse-wheel zoom easing</label>
      <select id="zft-camera-easing" name="cameraEasing">
        <option value="linear" ${s.easing === 'linear' ? 'selected' : ''}>Linear (steady speed)</option>
        <option value="easeOut" ${s.easing === 'easeOut' ? 'selected' : ''}>Ease Out (smooth stop)</option>
        <option value="easeInOut" ${s.easing === 'easeInOut' ? 'selected' : ''}>Ease In/Out</option>
      </select>
    </div>
    <p class="hint">Like Photoshop's hand tool: right-drag moves the canvas directly with the cursor. Release while moving to throw the canvas with friction; pause before release for an exact stop. Duration sets the maximum coast time and mouse-wheel zoom duration. Easing applies to mouse-wheel zoom only.</p>
  </div>`;
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: 'ZFT Cinematics | Smooth Camera' },
    position: { width: 465 },
    content,
    buttons: [
      { action: 'save', label: 'Save My Camera Preferences', icon: 'fa-solid fa-check', default: true,
        callback: (_event, button) => {
          const e = button.form.elements;
          return {
            cameraEnabled: e.cameraEnabled.checked,
            cameraSmoothPan: e.cameraSmoothPan.checked,
            cameraPanMomentum: e.cameraPanMomentum.checked,
            cameraSmoothZoom: e.cameraSmoothZoom.checked,
            cameraDuration: Number(e.cameraDuration.value),
            cameraEasing: e.cameraEasing.value
          };
        }
      },
      { action: 'cancel', label: 'Cancel' }
    ],
    rejectClose: false
  });
  if (!result) return;
  if (!Number.isFinite(result.cameraDuration) || result.cameraDuration < 100 ||
      result.cameraDuration > 1000 || !Number.isInteger(result.cameraDuration) ||
      !Object.hasOwn(EASING, result.cameraEasing)) {
    ui.notifications.warn('ZFT Cinematics: choose an animation duration from 100 to 1000 ms and a valid movement style.');
    return;
  }
  for (const [key, value] of Object.entries(result)) {
    if (client(key) !== value) await game.settings.set(ID, key, value);
  }
  stop();
  ui.notifications.info('ZFT Cinematics: your camera preferences are saved.');
}

export function initializeSmoothCamera() {
  if (installed) return;
  if (!game.modules.get('lib-wrapper')?.active || typeof libWrapper === 'undefined') {
    if (!warnedNoWrapper) console.warn(`${LOG} ⚠️ | libWrapper inactive. Native camera controls left unchanged.`);
    warnedNoWrapper = true;
    return;
  }
  try {
    libWrapper.register(ID, 'Canvas.prototype._onMouseWheel', wheel, 'WRAPPER');
    libWrapper.register(ID, 'Canvas.prototype._onDragRightStart', dragStart, 'WRAPPER');
    libWrapper.register(ID, 'Canvas.prototype._onDragRightMove', dragMove, 'WRAPPER');
    libWrapper.register(ID, 'Canvas.prototype._onDragRightDrop', dragEnd, 'WRAPPER');
    libWrapper.register(ID, 'Canvas.prototype._onDragRightCancel', dragCancel, 'WRAPPER');
    Hooks.on('canvasTearDown', () => { stop(); drag = false; unlistenPointer(); dragSamples = []; pointerSamples = []; });
    Hooks.on('canvasReady', stop);
    installed = true;
    installedPhase = game.ready ? 'ready' : 'setup';
    noConflict();
  } catch (error) {
    stop();
    console.error(`${LOG} ❌ | Could not initialize smooth camera; Foundry camera controls remain available`, error);
  }
}

export function contributeSmoothCameraTool(tools) {
  if (!game.user) return;
  tools['zft-cinematics-camera'] = {
    name: 'zft-cinematics-camera',
    title: 'Smooth Camera: My Preferences',
    icon: 'fa-solid fa-video',
    order: 25,
    gmOnly: false,
    button: true,
    visible: true,
    onChange: () => void openCameraSettings().catch(error => {
      console.error(`${LOG} ❌ | Camera preferences could not open`, error);
      ui.notifications.error('ZFT Cinematics: unable to open camera settings.');
    })
  };
}
export const smoothCameraApi = Object.freeze({
  openSettings: openCameraSettings,
  stop,
  status: cameraStatus
});
