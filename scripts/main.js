const ID = 'zft-cinematics';
const VERSION = '0.1.0-dev.3';
const LOG = `[ZFT] 🎬 v${VERSION}`;
const EFFECTS = ['fade', 'wipe-left', 'wipe-right', 'wipe-up', 'wipe-down'];
const active = new Map();
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
function sceneFromElement(element) {
  const node = element?.closest?.('[data-entry-id], [data-document-id], [data-scene-id]') ?? element;
  const data = node?.dataset;
  return resolveScene(data?.entryId ?? data?.documentId ?? data?.sceneId);
}
function overlayElement() {
  const element = document.createElement('div');
  element.className = 'zft-cinematics-overlay';
  element.setAttribute('aria-hidden', 'true');
  document.body.append(element);
  return element;
}
function appendMedia(element, src) {
  if (!src) return;
  const video = /\.(webm|mp4|ogg)(?:[?#]|$)/i.test(src);
  const media = document.createElement(video ? 'video' : 'img');
  media.className = 'zft-cinematics-media';
  media.src = src;
  if (video) {
    media.autoplay = true;
    media.loop = true;
    media.muted = true;
    media.playsInline = true;
  }
  element.append(media);
  if (video) media.play().catch(() => {});
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

async function cover({ id, effect, splash, duration }) {
  cancelAll();
  const abort = new AbortController();
  const overlay = overlayElement();
  active.set(id, { abort, overlay, effect, duration });
  appendMedia(overlay, splash);
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
async function transition(destination, options = {}) {
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
  const effect = EFFECTS.includes(options.effect) ? options.effect : setting('effect');
  const duration = Math.max(250, Math.min(3000, Number(setting('duration')) || 1000));
  const splash = options.splash ?? scene.getFlag(ID, 'splash') ?? setting('splash');
  const id = makeId();
  transition.busy = true;
  console.info(`${LOG} 🚀 | Transition requested`, { destination: scene.name, effect, duration });
  try {
    const covered = await broadcast('cover', { id, effect, splash, duration });
    if (!covered) throw new Error('Local cover could not be displayed');
    await scene.activate();
    const revealed = await broadcast('reveal', { id, sceneId: scene.id });
    if (!revealed) throw new Error('Destination reveal did not complete');
    return true;
  } catch (error) {
    console.error(`${LOG} ❌ | Scene transition failed`, error);
    ui.notifications.error(`ZFT Cinematics: transition failed. See console for details.`);
    broadcast('cancel');
    return false;
  } finally {
    transition.busy = false;
  }
}
transition.busy = false;

async function openControls() {
  if (!game.user.isGM) return;
  const scenes = game.scenes.contents.filter(scene => scene.id !== game.scenes.active?.id);
  if (!scenes.length) {
    ui.notifications.warn('ZFT Cinematics: create another scene to test a transition.');
    return;
  }
  const sceneOptions = scenes
    .map(scene => `<option value="${escapeHTML(scene.id)}">${escapeHTML(scene.name)}</option>`)
    .join('');
  const effects = EFFECTS.map(effect =>
    `<option value="${effect}" ${effect === setting('effect') ? 'selected' : ''}>${escapeHTML(effect.replace('-', ' '))}</option>`
  ).join('');
  try {
    const selection = await foundry.applications.api.DialogV2.wait({
      window: { title: 'ZFT Cinematics | Test Transition' },
      content: `<div class="zft-cinematics-dialog">
        <label for="zft-cinematics-destination">Destination scene</label>
        <select id="zft-cinematics-destination" name="sceneId">${sceneOptions}</select>
        <label for="zft-cinematics-effect">Transition effect</label>
        <select id="zft-cinematics-effect" name="effect">${effects}</select>
        <p class="hint">Activates the destination for all players. Duration and optional splash media are configured in Module Settings.</p>
      </div>`,
      buttons: [
        { action: 'transition', label: 'Transition', icon: 'fa-solid fa-film', default: true,
          callback: (_event, button) => ({ sceneId: button.form.elements.sceneId.value, effect: button.form.elements.effect.value }) },
        { action: 'cancel', label: 'Cancel' }
      ],
      rejectClose: false
    });
    if (selection?.sceneId) await transition(selection.sceneId, { effect: selection.effect });
  } catch (error) {
    console.error(`${LOG} ❌ | Failed to open transition controls`, error);
    ui.notifications.error('ZFT Cinematics: could not open transition controls.');
  }
}

async function browseSplash(input) {
  const Picker = foundry.applications.apps.FilePicker.implementation;
  const picker = new Picker({
    type: 'imagevideo', current: input.value,
    callback: path => {
      input.value = path;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      console.info(`${LOG} 📁 | Splash media selected`, { path });
    }
  });
  await picker.render({ force: true });
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
  game.settings.register(ID, 'loadTimeout', {
    name: 'Scene Load Timeout (seconds)', scope: 'world', config: true, type: Number,
    range: { min: 5, max: 60, step: 1 }, default: 20
  });
  console.info(`${LOG} 🚀 | Initialized`);
});
Hooks.once('ready', () => {
  game.socket.on(`module.${ID}`, payload => {
    // Avoid processing a second copy if the socket server echoes the sender's payload.
    if (payload?.sender === game.user.id) return;
    void receive(payload);
  });
  game.modules.get(ID).api = Object.freeze({
    transition, openControls,
    cancel: () => { if (game.user.isGM) broadcast('cancel'); }
  });
  console.info(`${LOG} ✅ | Ready. GM: open Cinematics from ZFT Tools.`);
});

// V13 / V14 scene-directory and scene-navigation context menus.
Hooks.on('getSceneContextOptions', (_application, options) => {
  if (!game.user.isGM) return;
  options.push({
    name: 'ZFT Cinematics: Transition Here', icon: '<i class="fas fa-film"></i>',
    condition: element => {
      const scene = sceneFromElement(element);
      return Boolean(scene && scene.id !== game.scenes.active?.id);
    },
    callback: element => void transition(sceneFromElement(element))
  });
});

// ZFT Tools owns the left-toolbar control group. Cinematics contributes a button.
Hooks.on('zft-tools.collectTools', tools => {
  if (!game.user?.isGM) return;
  tools[ID] = {
    name: ID, title: 'ZFT Cinematics', icon: 'fa-solid fa-film',
    order: 10, button: true, visible: true,
    onChange: () => void openControls()
  };
});
