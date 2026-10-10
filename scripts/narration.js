/**
 * Narration is a first-party Cinematics feature. It has no dependency on
 * zft-narrate-only, and does not import or overwrite that module's settings.
 * The world setting is authoritative for persistence across all clients.
 */
const ID = 'zft-cinematics';
const VERSION = '0.1.0-dev.16';
const LOG = `[ZFT] 🎙️ v${VERSION} | Cinematics Narration`;
const STATE_KEY = 'narrationState';
const MINIMUM_ROLE_KEY = 'narrationMinimumRole';
const SPEAKER_ALIAS_KEY = 'narrationSpeakerAlias';
const OVERLAY_ID = 'zft-cinematics-narration-overlay';
const CHAT_FLAG = 'narration';
let externalNarrationChain = Promise.resolve();

function getSetting(key) { return game.settings.get(ID, key); }
function getState() { return getSetting(STATE_KEY); }

function mayNarrate(user = game.user) {
  return Boolean(user && Number(user.role) >= Number(getSetting(MINIMUM_ROLE_KEY)));
}
function escapeText(value) {
  return foundry.utils.escapeHTML(String(value ?? '').trim()).replace(/\r\n?|\n/g, '<br>');
}
function canSubmit() {
  if (mayNarrate()) return true;
  ui.notifications?.warn('ZFT Cinematics: you do not have permission to narrate.');
  console.warn(`${LOG} ⚠️ | Narration permission denied`, { userId: game.user?.id });
  return false;
}
function buildOverlay() {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) return existing;
  const overlay = document.createElement('section');
  overlay.id = OVERLAY_ID;
  overlay.className = 'zft-cinematics-narration-overlay';
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML = `
    <div class="zft-cinematics-narration-backdrop"></div>
    <article class="zft-cinematics-narration-card">
      <div class="zft-cinematics-narration-content"></div>
      <footer class="zft-cinematics-narration-controls">
        <button type="button" data-action="close-narration">Close Narration</button>
      </footer>
    </article>`;
  overlay.querySelector('[data-action="close-narration"]')?.addEventListener('click', () => {
    void closeNarration().catch(error => {
      console.error(`${LOG} ❌ | Could not close narration`, error);
      ui.notifications?.error('ZFT Cinematics: could not close narration.');
    });
  });
  document.body.append(overlay);
  return overlay;
}

function renderState(state = getState()) {
  const overlay = buildOverlay();
  const active = Boolean(state?.active && state?.message);
  const content = overlay.querySelector('.zft-cinematics-narration-content');
  if (!content) {
    console.error(`${LOG} ❌ | Narration overlay content element is missing`, { id: state?.id });
    ui.notifications?.error('ZFT Cinematics: narration overlay could not render. See console.');
    return false;
  }
  if (active) content.innerHTML = String(state.message);
  else content.textContent = '';
  overlay.classList.toggle('gm-control', Boolean(game.user?.isGM));
  overlay.classList.toggle('active', active);
  if (active) {
    // Log actual computed presentation only while a narration is active;
    // this distinguishes a setting-sync failure from stacking/visibility bugs.
    const style = window.getComputedStyle?.(overlay);
    console.info(`${LOG} 📖 | Persistent narration overlay rendered`, {
      id: state.id,
      display: style?.display,
      visibility: style?.visibility,
      opacity: style?.opacity,
      zIndex: style?.zIndex
    });
  }
  return true;
}

/**
 * Save authoritative world state before creating any narration chat card.
 * Foundry's setting onChange notifies the other clients; explicitly render
 * this client as well so the GM is not dependent on whether onChange fires
 * locally in V13. A failed save must NOT produce a chat-only narration.
 */
async function setNarrationState(state) {
  try {
    await game.settings.set(ID, STATE_KEY, state);
  } catch (error) {
    console.error(`${LOG} ❌ | Shared narration state update failed`, {
      userId: game.user?.id,
      isGM: Boolean(game.user?.isGM),
      error
    });
    ui.notifications?.error('ZFT Cinematics: could not display shared narration. No chat card was posted.');
    throw error;
  }
  if (!renderState(state)) {
    console.error(`${LOG} ❌ | Shared narration was saved but local overlay did not render`, { id: state?.id });
    ui.notifications?.error('ZFT Cinematics: narration state saved, but overlay is missing. See console.');
    // A remote client may have rendered the state. Do not write duplicate
    // chat cards while local presentation is unverified.
    return false;
  }
  return true;
}
function buildChatCard(message) {
  return `<section class="zft-cinematics-narration-chat-card">
    <header class="zft-cinematics-narration-chat-header">
      <i class="fa-solid fa-book-open"></i><strong>Narration</strong>
    </header>
    <div class="zft-cinematics-narration-chat-body">${message}</div>
  </section>`;
}

/** This operation must run on a GM client because narrationState is world-scoped. */
async function createNarrationAsGM(sanitized) {
  if (!game.user?.isGM) return false;
  const current = getState();
  const next = {
    id: Number(current?.id ?? 0) + 1,
    active: true,
    message: sanitized,
    createdAt: Date.now(),
    paused: true
  };
  if (!await setNarrationState(next)) return false;
  try {
    await ChatMessage.create({
      content: buildChatCard(sanitized),
      speaker: { alias: getSetting(SPEAKER_ALIAS_KEY), scene: game.user?.viewedScene },
      flags: { [ID]: { type: CHAT_FLAG, id: next.id } }
    });
  } catch (error) {
    console.warn(`${LOG} ⚠️ | Narration overlay is active, but chat card could not be posted`, error);
    ui.notifications?.warn('ZFT Cinematics: narration is on screen, but the chat card could not be posted.');
    return true;
  }
  console.info(`${LOG} ✅ | Narration overlay and chat card shared`, { id: next.id });
  return true;
}
// Only one connected GM updates the world-scoped overlay when a player posts
// a narrated ChatMessage. The author of the document is authenticated by
// Foundry; do not trust a client-supplied user ID in a privileged socket call.
function isPrimaryGM() {
  if (!game.user?.isGM) return false;
  const gms = Array.from(game.users).filter(user => user?.isGM && user.active);
  gms.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return gms[0]?.id === game.user.id;
}
async function handlePlayerNarration(message) {
  if (!isPrimaryGM() || message.flags?.[ID]?.request !== true) return;
  if (message.flags?.[ID]?.type !== CHAT_FLAG) return;
  const author = message.user;
  if (!author || !mayNarrate(author)) {
    console.warn(`${LOG} ⚠️ | Ignored unauthorized narration chat request`, {
      messageId: message.id, userId: author?.id
    });
    return;
  }
  const sanitized = escapeText(message.flags[ID].rawText);
  if (!sanitized) return;
  // Serialize concurrent authorized requests to avoid losing world state updates.
  const update = async () => {
    const previous = getState();
    const next = {
      id: Number(previous?.id ?? 0) + 1,
      active: true,
      message: sanitized,
      createdAt: Date.now(),
      paused: true
    };
    if (!await setNarrationState(next)) {
      console.error(`${LOG} ❌ | Player narration state saved but overlay could not render`, { messageId: message.id });
      return;
    }
    console.info(`${LOG} ✅ | Player narration shared`, {
      id: next.id, userId: author.id, messageId: message.id
    });
  };
  const run = externalNarrationChain.then(update, update);
  externalNarrationChain = run.catch(() => undefined);
  await run;
}

/** New API calls and slash commands take raw text; escaping happens here. */
export async function narrate(message) {
  if (!canSubmit()) return false;
  const raw = String(message ?? '').trim();
  if (!raw) {
    ui.notifications?.warn('ZFT Cinematics: enter narration text first.');
    return false;
  }
  if (game.user.isGM) return createNarrationAsGM(escapeText(raw));
  // Foundry authenticates ChatMessage authorship. The primary GM observes the
  // flagged message and writes the protected world setting for permitted roles.
  // No additional socket package is required.
  if (!Array.from(game.users).some(user => user?.isGM && user.active)) {
    ui.notifications?.warn('ZFT Cinematics: an active GM is required for shared narration.');
    return false;
  }
  await ChatMessage.create({
    content: buildChatCard(escapeText(raw)),
    speaker: { alias: getSetting(SPEAKER_ALIAS_KEY), scene: game.user?.viewedScene },
    flags: { [ID]: { type: CHAT_FLAG, request: true, rawText: raw } }
  });
  return true;
}
export async function closeNarration() {
  if (!game.user?.isGM) {
    ui.notifications?.warn('Only a GM can close narration for everyone.');
    return false;
  }
  const current = getState();
  const closed = await setNarrationState({
    id: Number(current?.id ?? 0),
    active: false,
    message: '',
    createdAt: Number(current?.createdAt ?? Date.now()),
    paused: true
  });
  if (closed) console.info(`${LOG} ✅ | Narration closed for everyone`);
  return closed;
}

export function openNarrationDialog(initialValue = '') {
  if (!canSubmit()) return;
  const content = `<form class="zft-cinematics-narration-dialog-form">
    <div class="form-group stacked">
      <label>Narration Text</label>
      <textarea name="narration" rows="8" autofocus placeholder="Enter narration text...">${foundry.utils.escapeHTML(initialValue)}</textarea>
    </div>
  </form>`;
  new Dialog({
    title: 'Narrate', content,
    buttons: {
      narrate: {
        icon: "<i class='fa-solid fa-book-open'></i>", label: 'Narrate',
        callback: html => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          const raw = root?.querySelector('textarea[name="narration"]')?.value ?? '';
          void narrate(raw).catch(error => {
            console.error(`${LOG} ❌ | Narration submission failed`, error);
            ui.notifications?.error('ZFT Cinematics: narration failed. See console.');
          });
        }
      },
      cancel: { icon: "<i class='fa-solid fa-xmark'></i>", label: 'Cancel' }
    },
    default: 'narrate',
    render: html => {
      const root = html instanceof HTMLElement ? html : html?.[0];
      root?.querySelector('textarea[name="narration"]')?.focus();
    }
  }, { width: 520, classes: ['zft-cinematics-narration-dialog'] }).render(true);
}

function handleChatCommand(_log, content) {
  const raw = String(content ?? '').trim();
  if (/^\/(?:narrate|narration)-close$/i.test(raw)) {
    void closeNarration().catch(error => {
      console.error(`${LOG} ❌ | Close command failed`, error);
      ui.notifications?.error('ZFT Cinematics: closing narration failed.');
    });
    return false;
  }
  if (/^\/(?:narrate|narration)$/i.test(raw)) {
    openNarrationDialog();
    return false;
  }
  const match = raw.match(/^\/(?:narrate|narration)\s+([^]*)/i);
  if (!match) return true;
  void narrate(match[1]).catch(error => {
    console.error(`${LOG} ❌ | Narration command failed`, error);
    ui.notifications?.error('ZFT Cinematics: narration failed.');
  });
  return false;
}
function decorateChatMessage(message, html) {
  if (message.flags?.[ID]?.type !== CHAT_FLAG) return;
  const element = html instanceof HTMLElement ? html : html?.[0];
  element?.classList.add('zft-cinematics-narration-chat-message');
}

export function registerNarrationSettings() {
  game.settings.register(ID, STATE_KEY, {
    scope: 'world', config: false, type: Object,
    default: { id: 0, active: false, message: '', createdAt: 0, paused: true },
    onChange: renderState
  });
  game.settings.register(ID, MINIMUM_ROLE_KEY, {
    name: 'Narration: Minimum Role',
    hint: 'Minimum user role for narration slash commands; toolbar action remains GM-only. An active GM applies player narration to the shared overlay.',
    scope: 'world', config: true, type: Number,
    choices: { 1: 'Player', 2: 'Trusted Player', 3: 'Assistant GM', 4: 'Gamemaster' },
    default: CONST.USER_ROLES.GAMEMASTER
  });
  game.settings.register(ID, SPEAKER_ALIAS_KEY, {
    name: 'Narration: Chat Speaker', hint: 'Alias used for narration chat cards.',
    scope: 'world', config: true, type: String, default: 'Narrator'
  });
}
export function initializeNarration() {
  buildOverlay();
  renderState();
  // These hooks belong to Cinematics now and are registered only once per client.
  Hooks.on('chatMessage', handleChatCommand);
  Hooks.on('createChatMessage', (message) => {
    void handlePlayerNarration(message).catch(error => {
      console.error(`${LOG} ❌ | Player narration synchronization failed`, error);
    });
  });
  Hooks.on('renderChatMessageHTML', decorateChatMessage);
  console.info(`${LOG} ✅ | Ready. ZFT Tools Narrate, /narrate, /narration, /narrate-close`);
}
export function contributeNarrationTool(tools) {
  if (!game.user?.isGM) return;
  tools['zft-cinematics-narrate'] = {
    name: 'zft-cinematics-narrate',
    title: 'Narrate',
    icon: 'fa-solid fa-book-open',
    order: 35,
    button: true,
    visible: true,
    onChange: () => openNarrationDialog()
  };
}
export const narrationApi = Object.freeze({
  openDialog: openNarrationDialog,
  narrate,
  close: closeNarration
});
