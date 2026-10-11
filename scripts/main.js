import { registerNarrationSettings, initializeNarration, contributeNarrationTool, narrationApi } from './narration.js';
import { registerCameraSettings, initializeSmoothCamera, contributeSmoothCameraTool, smoothCameraApi } from './smooth-camera.js';

const ID = 'zft-cinematics';
const VERSION = '0.1.0';
const LOG = `[ZFT] 🎬 v${VERSION}`;
const EFFECTS = ['fade', 'wipe-left', 'wipe-right', 'wipe-up', 'wipe-down'];
const PRESENTATION_MODES = ['black', 'logo', 'single', 'random'];
const MEDIA_EXTENSIONS = /\.(?:png|jpe?g|webp|webm)(?:[?#]|$)/i;
const MEDIA_LIST_TTL = 5 * 60 * 1000;
const mediaLists = new Map();
let previousRandomMedia = null;
const active = new Map();
// Foundry's Scene.activate() is wrapped through the already-installed libWrapper,
// instead of relying on a preUpdateScene event which V13 does not reliably emit.
// A quick choice affects one activation only and never changes saved world defaults.
let nextEffect = null;
let bypassNative = false;

// Expose an ephemeral one-shot choice to CSS. This is local to the GM browser;
// it never modifies the saved world default or affects player clients.
function syncQuickEffectHighlight() {
  if (document.documentElement) {
    document.documentElement.dataset.zftCinematicsNextEffect = nextEffect ?? '';
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const makeId = () => `${game.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function setting(key) { return game.settings.get(ID, key); }
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
function resolveScene(input) {
  // Accept the actual Scene or its ID; reject other objects and unknown IDs.
  const id = typeof input === 'string' ? input : input?.id;
  return typeof id === 'string' ? game.scenes.get(id) : null;
}
function overlayElement() {
  const element = document.createElement('div');
  element.className = 'zft-cinematics-overlay';
  element.setAttribute('aria-hidden', 'true');
  document.body.append(element);
  return element;
}
function appendMedia(element, src, fit = 'cover') {
  if (!src) return;
  const video = /\.(webm|mp4|ogg)(?:[?#]|$)/i.test(src);
  const media = document.createElement(video ? 'video' : 'img');
  media.className = 'zft-cinematics-media';
  media.classList.add(fit === 'contain' ? 'zft-cinematics-media-contain' : 'zft-cinematics-media-cover');
  media.addEventListener('error', () => {
    console.warn(`${LOG} ⚠️ | Presentation media unavailable; showing black instead`, { src });
    media.remove();
  }, { once: true });
  if (video) {
    media.autoplay = true;
    media.loop = true;
    media.muted = true;
    media.playsInline = true;
  }
  media.src = src;
  element.append(media);
  if (video) void media.play().catch(error => {
    // Autoplay can be denied independently on the GM and player browsers.
    console.warn(`${LOG} ⚠️ | Presentation video could not autoplay`, { src, error });
    media.remove();
  });
}

function appendLogoOverlay(element, logoPath) {
  if (!logoPath) return;
  const logo = document.createElement('img');
  logo.className = 'zft-cinematics-brand-logo';
  logo.alt = '';
  logo.addEventListener('error', () => {
    console.warn(`${LOG} ⚠️ | Optional branding logo could not load`, { logoPath });
    logo.remove();
  }, { once: true });
  logo.src = logoPath;
  element.append(logo);
}

// Foundry V13's static FilePicker.browse returns the directory's file list.
// Only the GM browses it, and the chosen path is included in the cover socket
// payload so players never independently randomize their own splash media.
async function listRandomMedia(folder, refresh = false) {
  const directory = String(folder ?? '').trim();
  if (!directory) return [];
  const cache = mediaLists.get(directory);
  if (!refresh && cache && cache.expires > Date.now()) return cache.files;
  const Picker = foundry.applications.apps.FilePicker.implementation;
  // Initial support intentionally uses the Foundry data source, not S3 buckets.
  const result = await Picker.browse('data', directory);
  const files = [...new Set((result?.files ?? [])
    .filter(file => typeof file === 'string' && MEDIA_EXTENSIONS.test(file)))];
  mediaLists.set(directory, { files, expires: Date.now() + MEDIA_LIST_TTL });
  console.info(`${LOG} 📁 | Transition media folder indexed`, { directory, count: files.length });
  return files;
}

async function randomMedia(folder) {
  try {
    const files = await listRandomMedia(folder);
    if (!files.length) {
      console.warn(`${LOG} ⚠️ | No supported splash media found; using black`, { folder });
      return '';
    }
    const alternatives = files.length > 1
      ? files.filter(file => file !== previousRandomMedia)
      : files;
    const choices = alternatives.length ? alternatives : files;
    const path = choices[Math.floor(Math.random() * choices.length)];
    previousRandomMedia = path;
    return path;
  } catch (error) {
    console.warn(`${LOG} ⚠️ | Cannot browse transition media folder; using black`, { folder, error });
    return '';
  }
}

async function selectPresentation(scene, options = {}) {
  // 'single' remains the default to keep saved Dev 14 splash/scene flags working.
  const mode = PRESENTATION_MODES.includes(options.presentationMode)
    ? options.presentationMode : setting('presentationMode');
  const chosen = PRESENTATION_MODES.includes(mode) ? mode : 'single';
  const logoPath = String(setting('logoPath') ?? '').trim();
  const fit = setting('presentationFit') === 'contain' ? 'contain' : 'cover';
  let src = '';
  if (chosen === 'single') src = options.splash ?? scene.getFlag(ID, 'splash') ?? setting('splash');
  if (chosen === 'logo') src = logoPath;
  if (chosen === 'random') src = await randomMedia(setting('mediaFolder'));
  const presentation = {
    mode: chosen,
    src: typeof src === 'string' ? src.trim() : '',
    fit: chosen === 'logo' ? 'contain' : fit,
    logo: (chosen === 'single' || chosen === 'random') && setting('overlayLogo') ? logoPath : ''
  };
  console.info(`${LOG} 🖼️ | Presentation selected`, { mode: presentation.mode, src: presentation.src || '(black)', overlayLogo: Boolean(presentation.logo) });
  return presentation;
}
async function animate(element, frames, duration, signal) {
  if (signal.aborted) throw new DOMException('Transition cancelled', 'AbortError');
  const animation = element.animate(frames, { duration, fill: 'forwards', easing: 'ease-in-out' });
  const onAbort = () => animation.cancel();
  signal.addEventListener('abort', onAbort, { once: true });
  try { await animation.finished; }
  finally { signal.removeEventListener('abort', onAbort); }
}
function cleanup(id) {
  const state = active.get(id);
  if (!state) return;
  active.delete(id);
  clearTimeout(state.watchdog);
  state.abort.abort();
  state.overlay.remove();
}
function cancelAll() {
  for (const id of [...active.keys()]) cleanup(id);
}

function coverFrames(effect) {
  // Slide a full-screen black or splash cover across the OUTGOING scene.
  // Unlike Dev 2, directional wipes do not begin with an opacity fade.
  switch (effect) {
    case 'wipe-left': return [
      { opacity: 1, clipPath: 'inset(0 0 0 100%)' },
      { opacity: 1, clipPath: 'inset(0 0 0 0)' }
    ];
    case 'wipe-right': return [
      { opacity: 1, clipPath: 'inset(0 100% 0 0)' },
      { opacity: 1, clipPath: 'inset(0 0 0 0)' }
    ];
    case 'wipe-up': return [
      { opacity: 1, clipPath: 'inset(100% 0 0 0)' },
      { opacity: 1, clipPath: 'inset(0 0 0 0)' }
    ];
    case 'wipe-down': return [
      { opacity: 1, clipPath: 'inset(0 0 100% 0)' },
      { opacity: 1, clipPath: 'inset(0 0 0 0)' }
    ];
    default: return [{ opacity: 0 }, { opacity: 1 }];
  }
}

async function cover({ id, effect, splash, presentation, duration }) {
  cancelAll();
  const abort = new AbortController();
  const overlay = overlayElement();
  // Retain splash fallback for older in-flight payloads during development.
  const visual = presentation ?? { mode: 'single', src: splash, fit: 'cover', logo: '' };
  overlay.dataset.presentation = visual.mode ?? 'single';
  // The initiating GM might disconnect before sending a reveal/cancel; never leave a
  // remote client under a permanent overlay when a transition is interrupted.
  const watchdog = setTimeout(() => {
    if (active.has(id)) {
      console.warn(`${LOG} ⚠️ | Transition watchdog removed a stale overlay`, { id });
      cleanup(id);
    }
  }, Math.max(8000, Number(setting('loadTimeout')) * 1000 + 2 * duration + 3000));
  active.set(id, { abort, overlay, effect, duration, watchdog });
  appendMedia(overlay, visual.src, visual.fit);
  appendLogoOverlay(overlay, visual.logo);
  console.info(`${LOG} 🎯 | Cover started`, { effect, id });
  try {
    // A fully opaque black/splash cover is applied before the scene changes.
    await animate(overlay, coverFrames(effect), duration, abort.signal);
    return true;
  } catch (error) {
    if (error.name !== 'AbortError') console.error(`${LOG} ❌ | Cover failed`, error);
    cleanup(id);
    return false;
  }
}
function revealFrames(effect) {
  switch (effect) {
    case 'wipe-left': return [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 100% 0 0)' }];
    case 'wipe-right': return [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 0 100%)' }];
    case 'wipe-up': return [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(100% 0 0 0)' }];
    case 'wipe-down': return [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }];
    default: return [{ opacity: 1 }, { opacity: 0 }];
  }
}
async function reveal({ id, sceneId }) {
  const state = active.get(id);
  if (!state) {
    console.warn(`${LOG} ⚠️ | Reveal received without an active cover`, { id, sceneId });
    return false;
  }
  const deadline = Date.now() + Math.max(5000, Number(setting('loadTimeout')) * 1000);
  try {
    while ((!canvas?.ready || canvas?.scene?.id !== sceneId) && Date.now() < deadline) {
      if (state.abort.signal.aborted) return false;
      await sleep(100);
    }
    if (!canvas?.ready || canvas?.scene?.id !== sceneId) {
      console.warn(`${LOG} ⚠️ | Canvas load timeout, clearing overlay`, { sceneId });
      return false;
    }
    console.info(`${LOG} 🎯 | Revealing destination`, { sceneId, effect: state.effect });
    await animate(state.overlay, revealFrames(state.effect), state.duration, state.abort.signal);
    console.info(`${LOG} ✅ | Transition completed`, { sceneId });
    return true;
  } catch (error) {
    if (error.name !== 'AbortError') console.error(`${LOG} ❌ | Reveal failed`, error);
    return false;
  } finally {
    cleanup(id);
  }
}
function receive(payload) {
  if (!payload || payload.module !== ID) return;
  const sender = game.users.get(payload.sender);
  // Sockets coordinate screen effects only. They never grant document permissions.
  if (!sender?.isGM || !sender.active) return;
  if (payload.action === 'cover') return cover(payload);
  if (payload.action === 'reveal') return reveal(payload);
  if (payload.action === 'cancel') cancelAll();
}
function broadcast(action, data = {}) {
  const payload = { module: ID, sender: game.user.id, action, ...data };
  game.socket.emit(`module.${ID}`, payload);
  // Foundry module socket messages are not guaranteed to echo to the sender.
  return receive(payload);
}
async function transition(destination, options = {}, activateOriginal = null, isNative = false) {
  if (!game.user.isGM) {
    ui.notifications.warn('ZFT Cinematics: only a GM can start transitions.');
    return false;
  }
  const scene = resolveScene(destination);
  if (!scene) {
    ui.notifications.warn('ZFT Cinematics: destination scene not found.');
    return false;
  }
  if (scene.id === game.scenes.active?.id) {
    ui.notifications.warn('ZFT Cinematics: select an inactive destination scene.');
    return false;
  }
  if (transition.busy) {
    ui.notifications.warn('ZFT Cinematics: a transition is already running.');
    return false;
  }
  const effect = EFFECTS.includes(options.effect) ? options.effect :
    (nextEffect && EFFECTS.includes(nextEffect) ? nextEffect : setting('effect'));
  // Consume the quick choice exactly once, regardless of the transition path.
  nextEffect = null;
  syncQuickEffectHighlight();
  const duration = Math.max(250, Math.min(3000, Number(setting('duration')) || 1000));
  const id = makeId();
  transition.busy = true;
  let activationStarted = false;
  console.info(`${LOG} 🚀 | Transition requested`, { destination: scene.name, effect, duration });
  try {
    const presentation = await selectPresentation(scene, options);
    const covered = await broadcast('cover', { id, effect, presentation, duration });
    if (!covered) throw new Error('Local cover could not be displayed');
    bypassNative = true;
    try {
      activationStarted = true;
      if (activateOriginal) await activateOriginal();
      else await scene.activate();
    } finally {
      bypassNative = false;
    }
    if (game.scenes.active?.id !== scene.id) {
      throw new Error(`Foundry did not activate the destination: ${scene.name}`);
    }
    const revealed = await broadcast('reveal', { id, sceneId: scene.id });
    if (!revealed) throw new Error('Destination reveal did not complete');
    return true;
  } catch (error) {
    console.error(`${LOG} ❌ | Scene transition failed`, error);
    ui.notifications.error(`ZFT Cinematics: transition failed. See console for details.`);
    broadcast('cancel');
    // Never strand a normal Foundry activation if the cover animation fails
    // BEFORE we invoke the original activation. Do not retry one that already ran.
    if (isNative && !activationStarted && activateOriginal) {
      console.warn(`${LOG} ⚠️ | Continuing normal scene activation without effect`);
      return await activateOriginal();
    }
    return false;
  } finally {
    transition.busy = false;
  }
}
transition.busy = false;

// The Cinematics action in the right-hand tools column edits persistent world defaults. Native Foundry scene
// selection remains in the Scene Navigation and Scenes directory.
async function openControls() {
  if (!game.user?.isGM) return;
  const effectOptions = EFFECTS.map(effect =>
    `<option value="${effect}" ${effect === setting('effect') ? 'selected' : ''}>${escapeHTML(effect.replace('-', ' '))}</option>`
  ).join('');
  const mode = PRESENTATION_MODES.includes(setting('presentationMode')) ? setting('presentationMode') : 'single';
  const modeOptions = [
    ['single', 'Single image or video (existing splash)'],
    ['random', 'Random image or video from folder'],
    ['logo', 'Centered logo on black'],
    ['black', 'Black screen, no graphic']
  ].map(([value, title]) => `<option value="${value}" ${mode === value ? 'selected' : ''}>${escapeHTML(title)}</option>`).join('');
  const fitOptions = [
    ['cover', 'Full screen (fills, may crop)'],
    ['contain', 'Fit whole media on black (no crop)']
  ].map(([value, title]) => `<option value="${value}" ${setting('presentationFit') === value ? 'selected' : ''}>${escapeHTML(title)}</option>`).join('');
  const fileField = (key, label, placeholder, modeGroup, title) => `
    <div class="zft-cinematics-field" data-mode-group="${modeGroup}">
      <label for="zft-cinematics-${key}">${escapeHTML(label)}</label>
      <div class="zft-cinematics-path-row">
        <input id="zft-cinematics-${key}" name="${key}" type="text" value="${escapeHTML(setting(key))}" placeholder="${escapeHTML(placeholder)}">
        <button type="button" class="zft-cinematics-quick-browse" data-browse="${key}" title="${escapeHTML(title)}"><i class="fa-solid fa-folder-open"></i></button>
      </div>
    </div>`;
  const content = `<div class="zft-cinematics-settings-panel">
    <label class="zft-cinematics-toggle">
      <input type="checkbox" name="automatic" ${setting('automatic') ? 'checked' : ''}>
      <span><strong>Automatic scene transitions</strong><small>Use these defaults when activating scenes normally in Foundry.</small></span>
    </label>
    <div class="zft-cinematics-field">
      <label for="zft-cinematics-effect">Default effect</label>
      <select id="zft-cinematics-effect" name="effect">${effectOptions}</select>
    </div>
    <div class="zft-cinematics-field">
      <label for="zft-cinematics-duration">Duration (milliseconds)</label>
      <input type="number" id="zft-cinematics-duration" name="duration" min="250" max="3000" step="250" value="${Math.max(250, Math.min(3000, Number(setting('duration')) || 1000))}">
    </div>
    <hr class="zft-cinematics-separator">
    <label class="zft-cinematics-toggle">
      <input type="checkbox" name="smoothCameraAllowed" ${setting('smoothCameraAllowed') ? 'checked' : ''}>
      <span><strong>Allow Smooth Camera</strong><small>Allows users to configure their own local camera movement. This never broadcasts camera motion.</small></span>
    </label>
    <div class="zft-cinematics-field">
      <label for="zft-cinematics-presentationMode">Transition presentation</label>
      <select id="zft-cinematics-presentationMode" name="presentationMode">${modeOptions}</select>
    </div>
    ${fileField('splash', 'Single splash image/video', 'No splash media (black)', 'single', 'Browse for a splash file')}
    ${fileField('mediaFolder', 'Random media folder (Foundry Data)', 'e.g. assets/cinematics', 'random', 'Choose a media folder')}
    <div class="zft-cinematics-field" data-mode-group="random">
      <button type="button" class="zft-cinematics-refresh-media"><i class="fa-solid fa-arrows-rotate"></i> Refresh random media list</button>
      <small>PNG, JPG, JPEG, WebP and WebM. One file chosen by the GM per transition; immediate repeats avoided. Files cached for 5 minutes.</small>
    </div>
    ${fileField('logoPath', 'Logo image', 'e.g. assets/zantor-logo.png', 'logo media', 'Browse for your logo')}
    <div class="zft-cinematics-field" data-mode-group="media">
      <label for="zft-cinematics-presentationFit">Image/video display</label>
      <select id="zft-cinematics-presentationFit" name="presentationFit">${fitOptions}</select>
    </div>
    <label class="zft-cinematics-toggle" data-mode-group="media">
      <input type="checkbox" name="overlayLogo" ${setting('overlayLogo') ? 'checked' : ''}>
      <span><strong>Overlay centered logo on media</strong><small>Uses the logo above. Black screen and logo-only modes do not add an overlay.</small></span>
    </label>
    <p class="hint">Your existing splash stays the default. A destination scene's splash flag overrides it in Single mode. All media selection and effect choices are shared with players.</p>
  </div>`;
  try {
    const selection = await foundry.applications.api.DialogV2.wait({
      window: { title: 'ZFT Cinematics | Defaults' },
      position: { width: 510 },
      content,
      render: (_event, dialog) => {
        const root = dialog.element;
        if (!root) return;
        const modeSelect = root.querySelector('[name="presentationMode"]');
        const overlayInput = root.querySelector('[name="overlayLogo"]');
        const updateVisibility = () => {
          const selectedMode = modeSelect?.value ?? 'single';
          for (const section of root.querySelectorAll('[data-mode-group]')) {
            const group = section.dataset.modeGroup?.split(' ') ?? [];
            const show = group.includes(selectedMode) || (group.includes('media') && (selectedMode === 'single' || selectedMode === 'random'));
            section.hidden = !show;
          }
          if (overlayInput && selectedMode !== 'single' && selectedMode !== 'random') overlayInput.disabled = true;
          else if (overlayInput) overlayInput.disabled = false;
        };
        modeSelect?.addEventListener('change', updateVisibility);
        updateVisibility();
        for (const button of root.querySelectorAll('[data-browse]')) {
          button.addEventListener('click', () => {
            const name = button.dataset.browse;
            const input = root.querySelector(`[name="${name}"]`);
            if (!input) return;
            void browsePresentation(input, name === 'mediaFolder' ? 'folder' : 'imagevideo').catch(error => {
              console.error(`${LOG} ❌ | File picker failed`, error);
              ui.notifications.error('ZFT Cinematics: could not open the file browser.');
            });
          });
        }
        root.querySelector('.zft-cinematics-refresh-media')?.addEventListener('click', () => {
          const folder = root.querySelector('[name="mediaFolder"]')?.value.trim() ?? '';
          if (!folder) { ui.notifications.warn('ZFT Cinematics: select a media folder first.'); return; }
          void listRandomMedia(folder, true).then(files =>
            ui.notifications.info(`ZFT Cinematics: found ${files.length} supported files.`)
          ).catch(error => {
            console.warn(`${LOG} ⚠️ | Unable to refresh folder`, { folder, error });
            ui.notifications.warn('ZFT Cinematics: could not read the folder; transitions will use black.');
          });
        });
      },
      buttons: [
        { action: 'save', label: 'Save Defaults', icon: 'fa-solid fa-check', default: true,
          callback: (_event, button) => {
            const controls = button.form.elements;
            return {
              automatic: controls.automatic.checked,
              smoothCameraAllowed: controls.smoothCameraAllowed.checked,
              effect: controls.effect.value,
              duration: Number(controls.duration.value),
              presentationMode: controls.presentationMode.value,
              splash: controls.splash.value.trim(),
              mediaFolder: controls.mediaFolder.value.trim(),
              logoPath: controls.logoPath.value.trim(),
              presentationFit: controls.presentationFit.value,
              overlayLogo: controls.overlayLogo.checked
            };
          }
        },
        { action: 'cancel', label: 'Cancel' }
      ],
      rejectClose: false
    });
    if (!selection || typeof selection !== 'object') return;
    if (!EFFECTS.includes(selection.effect) || !Number.isFinite(selection.duration) ||
        selection.duration < 250 || selection.duration > 3000 ||
        !PRESENTATION_MODES.includes(selection.presentationMode) ||
        !['cover', 'contain'].includes(selection.presentationFit)) {
      ui.notifications.warn('ZFT Cinematics: invalid effect, presentation, or duration (250–3000 ms).');
      return;
    }
    // Reject unsafe/invalid random configuration rather than silently changing
    // the current working single-splash defaults.
    if (selection.presentationMode === 'random' && !selection.mediaFolder) {
      ui.notifications.warn('ZFT Cinematics: choose a folder for random media.');
      return;
    }
    if (selection.presentationMode === 'logo' && !selection.logoPath) {
      ui.notifications.warn('ZFT Cinematics: choose a logo image for logo mode.');
      return;
    }
    for (const [key, value] of Object.entries(selection)) {
      if (setting(key) !== value) await game.settings.set(ID, key, value);
    }
    ui.notifications.info('ZFT Cinematics: defaults saved.');
    console.info(`${LOG} ⚙️ | World defaults saved`, selection);
  } catch (error) {
    console.error(`${LOG} ❌ | Could not save cinematic defaults`, error);
    ui.notifications.error('ZFT Cinematics: defaults could not be saved. See console.');
  }
}

// Ordinary Scene Navigation/Directory "Activate" actions call Scene.activate().
// Wrap that call BEFORE it reaches the scene update so outgoing visuals can finish
// while the old scene is still displayed. A passive preUpdateScene hook is too late
// (and is not guaranteed to be raised by the native activation flow).
function installNativeSceneActivation() {
  if (!game.modules.get('lib-wrapper')?.active || typeof libWrapper === 'undefined') {
    console.warn(`${LOG} ⚠️ | Automatic native scene transitions need an active libWrapper. Use the native Activate action once libWrapper is enabled.`);
    return;
  }
  try {
    libWrapper.register(ID, 'CONFIG.Scene.documentClass.prototype.activate',
      async function (wrapped, ...args) {
        if (!game.ready || !game.user?.isGM || bypassNative || transition.busy ||
            !game.scenes.active || this.id === game.scenes.active.id || !canvas?.ready ||
            (!setting('automatic') && !nextEffect)) {
          return wrapped(...args);
        }
        const effect = nextEffect;
        nextEffect = null;
        syncQuickEffectHighlight();
        console.info(`${LOG} 🎯 | Native scene activation captured`, {
          destination: this.name, effect: effect ?? setting('effect')
        });
        const success = await transition(this, { effect: effect ?? setting('effect') }, () => wrapped(...args), true);
        // Keep the normal Scene.activate() return shape for callers.
        if (success === true || game.scenes.active?.id === this.id) return this;
        return success;
      }, 'WRAPPER');
    console.info(`${LOG} ✅ | Native Scene.activate wrapper registered`);
  } catch (error) {
    console.error(`${LOG} ❌ | Unable to install native scene transition wrapper`, error);
    ui.notifications.warn('ZFT Cinematics: automatic scene activation could not be hooked. Native activation continues without cinematic effects.');
  }
}

function queueNextEffect(effect) {
  if (!game.user?.isGM || !EFFECTS.includes(effect)) return;
  // Re-clicking the same effect cancels the one-shot selection.
  const cancelled = nextEffect === effect;
  nextEffect = cancelled ? null : effect;
  syncQuickEffectHighlight();
  console.info(`${LOG} ⚙️ | One-shot transition ${cancelled ? 'cleared' : 'queued'}`, { effect: nextEffect });
  ui.notifications.info(cancelled
    ? 'ZFT Cinematics: using your saved default again.'
    : `ZFT Cinematics: ${effect.replace('wipe-', 'Wipe ').replace('fade', 'Fade')} for the NEXT scene activation only.`);
}

async function browsePresentation(input, type = 'imagevideo') {
  const Picker = foundry.applications.apps.FilePicker.implementation;
  const picker = new Picker({
    type, current: input.value,
    callback: path => {
      input.value = path;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      console.info(`${LOG} 📁 | Presentation path selected`, { path, type });
    }
  });
  await picker.render({ force: true });
}

function browseSplash(input) {
  return browsePresentation(input, 'imagevideo');
}

// Add a native file-browser button next to the module's splash-path setting.
// This deliberately preserves the ordinary Foundry settings Save Changes flow.
Hooks.on('renderSettingsConfig', (app, html) => {
  if (!game.user?.isGM) return;
  const root = app.element ?? html?.[0] ?? html;
  const input = root?.querySelector?.('[name="zft-cinematics.splash"]');
  if (!input || input.parentElement?.querySelector('.zft-cinematics-browse')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'zft-cinematics-browse';
  button.title = 'Browse for a splash image or video';
  button.innerHTML = '<i class="fa-solid fa-folder-open"></i> Browse';
  button.addEventListener('click', () => {
    void browseSplash(input).catch(error => {
      console.error(`${LOG} ❌ | File picker failed`, error);
      ui.notifications.error('ZFT Cinematics: could not open the file browser.');
    });
  });
  input.insertAdjacentElement('afterend', button);
});

Hooks.once('init', () => {
  registerNarrationSettings();
  registerCameraSettings();
  game.settings.register(ID, 'automatic', {
    name: 'Enable Automatic Scene Transitions',
    hint: 'When the GM activates an inactive scene using normal Foundry controls, show the configured cinematic transition. Private scene viewing is not affected.',
    scope: 'world', config: true, type: Boolean, default: true
  });
  game.settings.register(ID, 'effect', {
    name: 'Default Transition Effect', scope: 'world', config: true, type: String,
    choices: Object.fromEntries(EFFECTS.map(effect => [effect, effect.replace('-', ' ')])), default: 'fade'
  });
  game.settings.register(ID, 'duration', {
    name: 'Animation Duration (ms)', scope: 'world', config: true, type: Number,
    range: { min: 250, max: 3000, step: 250 }, default: 1000
  });
  game.settings.register(ID, 'splash', {
    name: 'Default Splash Image or Video Path',
    hint: 'Optional world-accessible image/video path. A destination scene can override it with the zft-cinematics splash flag.',
    scope: 'world', config: true, type: String, default: ''
  });
  // New presentation settings are edited through ZFT Tools > Cinematics.
  // Default to 'single' to preserve existing Dev 14 world splash settings.
  game.settings.register(ID, 'presentationMode', {
    name: 'Transition Presentation Mode', scope: 'world', config: false,
    type: String, default: 'single'
  });
  game.settings.register(ID, 'presentationFit', {
    name: 'Transition Image/Video Display', scope: 'world', config: false,
    type: String, default: 'cover'
  });
  game.settings.register(ID, 'mediaFolder', {
    name: 'Random Transition Media Folder', scope: 'world', config: false,
    type: String, default: ''
  });
  game.settings.register(ID, 'logoPath', {
    name: 'Transition Branding Logo', scope: 'world', config: false,
    type: String, default: ''
  });
  game.settings.register(ID, 'overlayLogo', {
    name: 'Show Logo Over Splash Media', scope: 'world', config: false,
    type: Boolean, default: false
  });
  game.settings.register(ID, 'loadTimeout', {
    name: 'Scene Load Timeout (seconds)', scope: 'world', config: true, type: Number,
    range: { min: 5, max: 60, step: 1 }, default: 20
  });
  console.info(`${LOG} 🚀 | Initialized`);
});
// Install camera wrappers before canvas input callbacks can be bound to PIXI.
// Installing only at ready may be too late for right-drag events in V13.
Hooks.once('setup', initializeSmoothCamera);

Hooks.once('ready', () => {
  initializeNarration();
  // Fallback only if setup-time registration was unavailable.
  initializeSmoothCamera();
  syncQuickEffectHighlight();
  installNativeSceneActivation();
  game.socket.on(`module.${ID}`, payload => {
    // Avoid processing a second copy if the socket server echoes the sender's payload.
    if (payload?.sender === game.user.id) return;
    void receive(payload);
  });
  game.modules.get(ID).api = Object.freeze({
    transition, openControls, queueNextEffect, narration: narrationApi, camera: smoothCameraApi,
    getNextEffect: () => nextEffect,
    cancel: () => { if (game.user.isGM) broadcast('cancel'); }
  });
  console.info(`${LOG} ✅ | Ready. GM: ZFT Tools → Cinematics opens saved defaults.`);
});

// ZFT Tools owns the left toolbar; Cinematics contributes action buttons.
Hooks.on('zft-tools.collectTools', tools => {
  // Each player's local camera preferences are available without GM rights.
  // GM-only scene transitions and world settings remain gated below.
  if (!game.user) return;
  contributeSmoothCameraTool(tools);
  if (!game.user.isGM) return;
  tools[ID] = {
    name: ID, title: 'Cinematics: Saved Defaults', icon: 'fa-solid fa-gear',
    order: 10, button: true, visible: true,
    // V13 SceneControlTool.button triggers onChange when the right-hand
    // tool button is clicked. Do not inspect DOM event markup here; Foundry
    // may pass a PointerEvent with a target outside any [data-action] node.
    onChange: () => {
      console.info(`${LOG} 🎯 | Cinematics tool button clicked`);
      void openControls();
    }
  };
  const choices = [
    ['fade', 'Fade', 'fa-solid fa-circle-half-stroke'],
    ['wipe-left', 'Wipe Left', 'fa-solid fa-arrow-left'],
    ['wipe-right', 'Wipe Right', 'fa-solid fa-arrow-right'],
    ['wipe-up', 'Wipe Up', 'fa-solid fa-arrow-up'],
    ['wipe-down', 'Wipe Down', 'fa-solid fa-arrow-down']
  ];
  choices.forEach(([effect, label, icon], index) => {
    tools[`${ID}-${effect}`] = {
      name: `${ID}-${effect}`,
      title: `Next Scene: ${label} (one time; click again to cancel)`,
      icon, order: 40 + index, button: true, visible: true,
      onChange: () => queueNextEffect(effect)
    };
  });
  contributeNarrationTool(tools);
});
