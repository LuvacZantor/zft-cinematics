/**
 * ZFT Cinematics Narration - Phase 1 presentation + rich editor (V13 target).
 * The world setting remains authoritative; legacy message-only states and
 * narrate(text) calls are accepted without migration.
 */
const ID = 'zft-cinematics';
const VERSION = '0.2.0-dev.20';
const LOG = `[ZFT] 🎙️ v${VERSION} | Cinematics Narration`;
const STATE_KEY = 'narrationState';
const MINIMUM_ROLE_KEY = 'narrationMinimumRole';
const SPEAKER_ALIAS_KEY = 'narrationSpeakerAlias';
const EDITOR_PREFS_KEY = 'narrationEditorPreferences';
const APPEARANCE_DEFAULTS_KEY = 'narrationAppearanceDefaults';
const ASSETS_KEY = 'narrationManagedAssets';
const LIBRARY_MODULE = 'zft-narration-library';
const LIBRARY_PACK = `${LIBRARY_MODULE}.narrations`;
const LIBRARY_GRAPHICS = `modules/${LIBRARY_MODULE}/assets/graphics`;
const PREVIOUS_SHARED_GRAPHICS = `assets/${LIBRARY_MODULE}/graphics`;
const LIBRARY_INDEX_NAME = 'ZFT Graphics Index (Internal)';
const LIBRARY_INITIALIZED_KEY = 'narrationLibraryInitialized';
const LIBRARY_INDEX_SCHEMA = 1;
const ASSET_MAX_BYTES = 8 * 1024 * 1024;
const ASSET_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const OVERLAY_ID = 'zft-cinematics-narration-overlay';
const PREVIEW_OVERLAY_ID = 'zft-cinematics-narration-preview';
const SCROLL_SPEEDS = Object.freeze({'very-slow':8,slow:15,normal:25,fast:45,'very-fast':70});
const SCROLL_START_DELAY_MS = 1800;
const SCROLL_SOCKET = `module.${ID}`;
const SCROLL_SYNC_INTERVAL_MS = 110;
const TRANSITION_MODES = Object.freeze(['none','fade-in','fade-both','fade-black','dissolve']);
const DEFAULT_TRANSITION = 'fade-both';
function narrationScrollSpeed(value) {
  if (Object.hasOwn(SCROLL_SPEEDS,value)) return value;
  const custom = typeof value === 'string' && value.startsWith('custom:') ? value.slice(7) : value;
  if (/^\d+(?:\.\d+)?$/.test(String(custom ?? ''))) {
    const n = Number(custom);
    if (Number.isFinite(n)) return `custom:${Math.max(1,Math.min(120,Math.round(n)))}`;
  }
  return 'normal';
}
function narrationPixelsPerSecond(value) {
  const safe = narrationScrollSpeed(value);
  return SCROLL_SPEEDS[safe] ?? Number(safe.slice(7));
}
function normalizeScrollMode(value) {return value === 'follow-gm' ? 'follow-gm' : 'independent';}
function normalizeTransition(value) {return TRANSITION_MODES.includes(value) ? value : DEFAULT_TRANSITION;}
function normalizeTransitionDuration(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= .25 && n <= 5 ? Math.round(n*100)/100 : 1;
}
const DEFAULT_APPEARANCE = Object.freeze({
  textColor:'#f4efe4',cardColor:'#090a0d',texture:'',textureFit:'tile',darkness:45,
  tint:'#000000',backdropColor:'#000000',backdropOpacity:60
});
function safeHex(value, fallback) {
  const v=String(value ?? '').trim();
  if(/^#[0-9a-fA-F]{6}$/.test(v))return v.toLowerCase();
  if(/^#[0-9a-fA-F]{3}$/.test(v))return '#'+[...v.slice(1)].map(n=>n+n).join('').toLowerCase();
  const rgb=v.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*1(?:\.0+)?)?\s*\)$/i);
  if(rgb && rgb.slice(1).every(n=>Number(n)<=255))return '#'+rgb.slice(1).map(n=>Number(n).toString(16).padStart(2,'0')).join('');
  return fallback;
}
function safeOpacity(value, fallback) {
  const number=Number(value);
  return Number.isFinite(number) && number>=0 && number<=100 ? Math.round(number) : fallback;
}
function normalizeAppearance(value) {
  const a=value && typeof value==='object' ? value : {};
  return {
    textColor:safeHex(a.textColor,DEFAULT_APPEARANCE.textColor),
    cardColor:safeHex(a.cardColor,DEFAULT_APPEARANCE.cardColor),
    texture:safeImagePath(a.texture)||'',
    textureFit:['tile','cover','contain'].includes(a.textureFit) ? a.textureFit : 'tile',
    darkness:safeOpacity(a.darkness,DEFAULT_APPEARANCE.darkness),
    tint:safeHex(a.tint,DEFAULT_APPEARANCE.tint),
    backdropColor:safeHex(a.backdropColor,DEFAULT_APPEARANCE.backdropColor),
    backdropOpacity:safeOpacity(a.backdropOpacity,DEFAULT_APPEARANCE.backdropOpacity)
  };
}
/** GM-saved appearance defaults apply to new drafts, never silently overwrite
 * saved passages or an already published narration. A world setting lets any GM
 * in the same world use the same saved preset, without editing the library. */
function getAppearanceDefaults() {
  try { return normalizeAppearance(game.settings.get(ID,APPEARANCE_DEFAULTS_KEY)); }
  catch { return normalizeAppearance(DEFAULT_APPEARANCE); }
}
async function saveAppearanceDefaults(value) {
  if (!game.user?.isGM) throw new Error('Only a GM can save shared appearance defaults.');
  const appearance=normalizeAppearance(value);
  await game.settings.set(ID,APPEARANCE_DEFAULTS_KEY,appearance);
  return appearance;
}
function toRGBA(hex,percent) {
  const h=safeHex(hex,'#000000');
  return `rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},${percent/100})`;
}
function readAppearance(root) {
  const v=name=>root?.querySelector(`[name="${name}"]`)?.value;
  return normalizeAppearance({textColor:v('textColor'),cardColor:v('cardColor'),
    texture:v('backgroundTexture'),textureFit:v('textureFit'),darkness:v('textureDarkness'),
    tint:v('textureTint'),backdropColor:v('backdropColor'),backdropOpacity:v('backdropOpacity')});
}
function applyAppearanceInputs(root,appearance) {
  const a=normalizeAppearance(appearance);
  for(const [name,val] of Object.entries({textColor:a.textColor,cardColor:a.cardColor,
    backgroundTexture:a.texture,textureFit:a.textureFit,textureDarkness:a.darkness,
    textureTint:a.tint,backdropColor:a.backdropColor,backdropOpacity:a.backdropOpacity})){
    const input=root?.querySelector(`[name="${name}"]`);
    if(input)input.value=String(val);
  }
  const label=root?.querySelector('[data-zft-texture-label]');
  if(label)label.textContent=a.texture ? a.texture.split('/').pop() : 'No texture selected';
}
function applyNarrationAppearance(overlay,value) {
  const a=normalizeAppearance(value);
  const card=overlay?.querySelector('.zft-cinematics-narration-card');
  const backdrop=overlay?.querySelector('.zft-cinematics-narration-backdrop');
  if(!card||!backdrop)return;
  overlay.style.setProperty('--zft-narration-text-color',a.textColor);
  for(const el of overlay.querySelectorAll('.zft-cinematics-narration-title, .zft-cinematics-narration-content')) {
    el.style.setProperty('color',a.textColor,'important');
  }
  // Foundry themes may mark their typography colors !important. Honor only the
  // validated, sanitized span colors and backgrounds used by Narrate.
  for(const el of overlay.querySelectorAll('.zft-cinematics-narration-content [data-zft-fg], .zft-cinematics-narration-content [data-zft-bg]')) {
    const fg=safeHex(el.dataset.zftFg,'');
    const bg=safeHex(el.dataset.zftBg,'');
    if(fg) el.style.setProperty('color',fg,'important');
    if(bg) el.style.setProperty('background-color',bg,'important');
  }
  card.style.backgroundColor=a.cardColor;
  if(a.texture){
    // Only validated Foundry image paths reach CSS, never arbitrary URLs.
    card.style.backgroundImage=`linear-gradient(${toRGBA(a.tint,a.darkness)},${toRGBA(a.tint,a.darkness)}),url("${a.texture}")`;
    card.style.backgroundSize=a.textureFit==='tile'?'auto, auto':`auto, ${a.textureFit}`;
    card.style.backgroundRepeat=a.textureFit==='tile'?'no-repeat, repeat':'no-repeat, no-repeat';
    card.style.backgroundPosition='center';
  } else {
    card.style.backgroundImage=`linear-gradient(${toRGBA(a.tint,a.darkness)},${toRGBA(a.tint,a.darkness)})`;
    card.style.backgroundSize='auto';card.style.backgroundRepeat='no-repeat';
  }
  backdrop.style.background=toRGBA(a.backdropColor,a.backdropOpacity);
}
function readScrollSpeed(root) {
  const selected=root?.querySelector('[name="scrollSpeed"]')?.value ?? 'normal';
  return narrationScrollSpeed(selected === 'custom'
    ? `custom:${root?.querySelector('[name="customScrollSpeed"]')?.value ?? 25}` : selected);
}
function applyScrollSpeedInputs(root, value) {
  const select=root?.querySelector('[name="scrollSpeed"]');
  const custom=root?.querySelector('[name="customScrollSpeed"]');
  const customRow=root?.querySelector('[data-zft-custom-speed]');
  const safe=narrationScrollSpeed(value);
  if (select) select.value=safe.startsWith('custom:')?'custom':safe;
  if (custom) custom.value=String(safe.startsWith('custom:') ? narrationPixelsPerSecond(safe) : 25);
  if (customRow) customRow.hidden=!safe.startsWith('custom:');
}
function applyNarrationTransition(overlay, mode, seconds) {
  if (!overlay) return;
  overlay.dataset.transition=normalizeTransition(mode);
  overlay.style.setProperty('--zft-narration-fade-duration',`${normalizeTransitionDuration(seconds)}s`);
}
/** The persistent published overlay is reused for every post. Explicitly restart
 * its card animation when the authoritative narration id changes, including on
 * player clients that had an earlier publication visible. Never retrigger on an
 * unrelated render of the same state or when receiving scroll progress. */
function replayNarrationEntrance(overlay) {
  const card=overlay?.querySelector('.zft-cinematics-narration-card');
  if (!card) return;
  delete overlay.dataset.zftEntering;
  // Let the browser see the reset before starting the new entrance animation.
  void card.offsetWidth;
  overlay.dataset.zftEntering='true';
}
const CHAT_FLAG = 'narration';
const TYPES = Object.freeze(['narration', 'title', 'announcement', 'subtitle']);
const DEFAULT_DURATION = 12;
const MAX_DURATION = 300;
const MAX_NARRATION_TEXT = 20000;
const MAX_RICH_HTML = 60000;
const EDITOR_DEFAULTS = Object.freeze({
  type: 'narration', closeMode: 'manual', duration: DEFAULT_DURATION, scrollSpeed: 'normal',
  scrollMode: 'independent', transition: DEFAULT_TRANSITION, transitionDuration: 1,
  appearance:DEFAULT_APPEARANCE,
  fontFamily: '', fontSize: '', align: 'center',
  width: 960, height: 780, left: null, top: null, postChat: false
});
// Prefer per-client Foundry settings, not a world setting shared with players.
function getEditorPreferences() {
  try {
    const prefs = getSetting(EDITOR_PREFS_KEY) ?? {};
    const width = Number(prefs.width), height = Number(prefs.height);
    const safePos = (value, limit) => Number.isFinite(Number(value)) && value !== null
      ? Math.max(0, Math.min(Number(value), limit)) : null;
    return {
      ...EDITOR_DEFAULTS,
      type: TYPES.includes(prefs.type) ? prefs.type : EDITOR_DEFAULTS.type,
      closeMode: prefs.closeMode === 'timed' ? 'timed' : 'manual',
      duration: normalizeDuration(prefs.duration) || DEFAULT_DURATION,
      scrollSpeed: narrationScrollSpeed(prefs.scrollSpeed),
      scrollMode: normalizeScrollMode(prefs.scrollMode), transition: normalizeTransition(prefs.transition),
      transitionDuration: normalizeTransitionDuration(prefs.transitionDuration),
      appearance:normalizeAppearance(prefs.appearance),
      fontFamily: getAvailableNarrationFonts().includes(prefs.fontFamily) ? prefs.fontFamily : '',
      fontSize: Object.hasOwn(SAFE_SIZE_CLASSES, prefs.fontSize) ? String(prefs.fontSize) : '',
      align: ['left', 'center', 'right'].includes(prefs.align) ? prefs.align : 'center',
      postChat: prefs.postChat === true,
      width: Number.isFinite(width) && width >= 350 ? Math.min(width, 1800) : 960,
      height: Number.isFinite(height) && height >= 365 ? Math.min(height, 1300) : 780,
      left: safePos(prefs.left, 10000), top: safePos(prefs.top, 10000)
    };
  } catch (error) {
    console.warn(`${LOG} ⚠️ | Narrate editor preferences unavailable`, error);
    return { ...EDITOR_DEFAULTS };
  }
}
let editorPreferenceChain = Promise.resolve();
function saveEditorPreferences(prefs) {
  const value = { ...prefs };
  const update = () => game.settings.set(ID, EDITOR_PREFS_KEY, value).catch(error =>
    console.warn(`${LOG} ⚠️ | Could not save local Narrate editor preferences`, error));
  editorPreferenceChain = editorPreferenceChain.then(update, update);
  return editorPreferenceChain;
}

const SAFE_FONTS = Object.freeze({
  'Georgia': 'serif', 'Arial': 'sans', 'Trebuchet MS': 'display', 'Courier New': 'mono'
});
/** The loaded Foundry world font registry includes core and GM-added fonts. */
function getAvailableNarrationFonts() {
  const provider = foundry?.applications?.settings?.menus?.FontConfig ?? globalThis.FontConfig;
  let registered = [];
  try {
    if (typeof provider?.getAvailableFonts === 'function') registered = provider.getAvailableFonts();
  } catch (error) {
    console.warn(`${LOG} ⚠️ | Could not read Foundry font registry`, error);
  }
  // Guard older API layouts, without replacing Foundry's loaded-font list
  // with arbitrary system fonts or a hardcoded module-only font catalog.
  if (!Array.isArray(registered)) registered = [];
  if (!registered.length) {
    registered = Object.keys(CONFIG?.fontDefinitions ?? {}).filter(name =>
      CONFIG.fontDefinitions[name]?.editor !== false);
  }
  return [...new Set(registered.filter(name => typeof name === 'string' && name.trim())
    .map(name => name.trim()))].sort((a, b) => a.localeCompare(b));
}
/** Apply a validated Foundry font to locally rendered overlay or chat content. */
function applyNarrationFonts(container) {
  const families = new Set(getAvailableNarrationFonts());
  for (const node of container?.querySelectorAll?.('[data-zft-narration-font]') ?? []) {
    const family = node.getAttribute('data-zft-narration-font');
    if (!families.has(family)) continue;
    // CSSOM safely quotes family names; user input never enters a style string.
    node.style.fontFamily = JSON.stringify(family);
  }
}
const SAFE_SIZE_CLASSES = Object.freeze({
  '1': 'xs', '2': 'small', '3': 'normal', '4': 'large', '5': 'xl', '6': 'xxl', '7': 'huge'
});
const SAFE_SPAN_CLASSES = new Set([
  ...Object.values(SAFE_FONTS).map(name => `zft-narration-font-${name}`),
  ...Object.values(SAFE_SIZE_CLASSES).map(name => `zft-narration-size-${name}`)
]);
const SAFE_ALIGN_CLASSES = new Set(['zft-narration-align-left', 'zft-narration-align-center', 'zft-narration-align-right']);
const SAFE_HEADING_CLASSES = new Set(['zft-narration-heading-1', 'zft-narration-heading-2', 'zft-narration-heading-3']);

let externalNarrationChain = Promise.resolve();
let expiryTimer = null;
let previewSession = null; // GM-local, never stored in the world or sent over a socket.
let publishedDraft = null; // Client-only Save after Publish, scoped to the world state id.
let narrationSocketRegistered = false;
const lastGmScrollPacket = new Map(); // Ephemeral socket updates, never persisted to world state.
let hideContentTimer = null;
function sendNarrationScroll(packet) {
  if (!game.socket) return;
  game.socket.emit(SCROLL_SOCKET, packet);
}
function narrationStateKey(state) {return `${state?.id}:${state?.createdAt}`;}
function receiveNarrationScroll(packet) {
  if (!packet || !['progress','request'].includes(packet.kind)) return;
  const state=getState();
  if (!state?.active || normalizeScrollMode(state.scrollMode) !== 'follow-gm') return;
  if (String(state.gmId ?? '') !== String(packet.gmId ?? '') ||
      !game.users?.get?.(state.gmId)?.isGM ||
      packet.key !== narrationStateKey(state)) return;
  if (packet.kind === 'request') {
    if (game.user?.id===state.gmId) document.getElementById(OVERLAY_ID)?.zftScrollController?.broadcast(true);
    return;
  }
  if (game.user?.id===state.gmId) return;
  const progress=Number(packet.progress);
  if (!Number.isFinite(progress) || progress<0 || progress>1) return;
  lastGmScrollPacket.set(packet.key,packet);
  if (lastGmScrollPacket.size>12) lastGmScrollPacket.delete(lastGmScrollPacket.keys().next().value);
  document.getElementById(OVERLAY_ID)?.zftScrollController?.applyGmPacket(packet);
}

function getSetting(key) { return game.settings.get(ID, key); }
function getState() { return getSetting(STATE_KEY); }
function mayNarrate(user = game.user) {
  return Boolean(user && Number(user.role) >= Number(getSetting(MINIMUM_ROLE_KEY)));
}
function escapeHTML(value) {
  return foundry.utils.escapeHTML(String(value ?? '').trim());
}
function escapeText(value) {
  return escapeHTML(value).replace(/\r\n?|\n/g, '<br>');
}
function canSubmit() {
  if (mayNarrate()) return true;
  ui.notifications?.warn('ZFT Cinematics: you do not have permission to narrate.');
  console.warn(`${LOG} ⚠️ | Narration permission denied`, { userId: game.user?.id });
  return false;
}
function isPrimaryGM() {
  if (!game.user?.isGM) return false;
  const gms = Array.from(game.users).filter(user => user?.isGM && user.active);
  gms.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return gms[0]?.id === game.user.id;
}
/** Restrict illustrations to Foundry-served data paths, never scripts or inline data. */
function safeImagePath(input) {
  const path = String(input ?? '').trim();
  if (!path || path.length > 1000 || path.startsWith('/') || path.startsWith('\\') ||
      /[\\\\\x00-\x1f<>"'`]/.test(path) || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) return '';
  let decoded;
  try { decoded = decodeURIComponent(path); } catch { return ''; }
  if (decoded.startsWith('/') || decoded.startsWith('\\') ||
      /[\\\\\x00-\x1f<>"'`]/.test(decoded) || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(decoded) ||
      decoded.split(/[\/\\]/).some(part => part === '..' || part === '.')) return '';
  return path;
}
const IMAGE_WIDTHS = new Set(['25', '50', '75', '100']);
const IMAGE_ALIGNMENTS = new Set(['left', 'center', 'right']);
const IMAGE_TYPES = Object.freeze({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' });
/** Both the shared compendium and graphics now live inside the library module.
 * A module-owned assets directory is intentionally used for portability.
 * The library manifest MUST opt in to uploads via flags.canUpload.
 * Existing world and Data/assets images remain intact until explicitly migrated. */
function libraryEnabled() { return game.modules?.get(LIBRARY_MODULE)?.active === true; }
function getNarrationLibraryPack({ notify = true } = {}) {
  const pack = libraryEnabled() ? game.packs?.get(LIBRARY_PACK) : null;
  if (!pack && notify) ui.notifications?.warn('Narrate: enable ZFT Narration Library in this world, then restart Foundry.');
  return pack ?? null;
}
/** V13 compendium folders belong to the pack itself, not to a world Journal directory. */
function getNarrationFolders(pack) {
  const folders = Array.from(pack?.folders?.contents ?? []);
  const parentId = folder => typeof folder.folder === 'string' ? folder.folder : folder.folder?.id ?? null;
  const byId = new Map(folders.map(folder => [folder.id, folder]));
  const path = folder => {
    const names = [folder.name];
    const visited = new Set([folder.id]);
    let current = folder;
    for (let level = 0; level < 4; level++) {
      const parent = byId.get(parentId(current));
      if (!parent || visited.has(parent.id)) break;
      names.unshift(parent.name); visited.add(parent.id); current = parent;
    }
    return names.join(' / ');
  };
  return folders.map(folder => ({id: folder.id, name: folder.name, parent: parentId(folder),
    label: path(folder), depth: Math.min(path(folder).split(' / ').length - 1, 3)}))
    .sort((a,b) => a.label.localeCompare(b.label));
}
function narrationFolderOptions(pack, selected = '') {
  const options = [`<option value="">Unfiled / Root</option>`];
  for (const folder of getNarrationFolders(pack)) options.push(
    `<option value="${escapeHTML(folder.id)}" ${folder.id === selected ? 'selected' : ''}>${escapeHTML(folder.label)}</option>`);
  return options.join('');
}
async function createNarrationFolder(pack, name, parentId = '') {
  if (!game.user?.isGM || pack?.locked) throw new Error('Unlock ZFT Narrations to manage folders.');
  const cleaned = String(name ?? '').trim().slice(0, 100);
  if (!cleaned) throw new Error('Give the folder a name.');
  const folders = getNarrationFolders(pack);
  const parent = parentId ? folders.find(f => f.id === parentId) : null;
  if (parentId && !parent) throw new Error('Parent folder is no longer available.');
  if (parent && parent.depth >= 3) throw new Error('Foundry supports up to four folder levels.');
  const sibling = folders.some(f => f.parent === (parentId || null) && f.name.toLowerCase() === cleaned.toLowerCase());
  if (sibling) throw new Error('A folder with that name already exists here.');
  const doc = await Folder.implementation.create({name: cleaned, type: 'JournalEntry',
    folder: parentId || null}, {pack: LIBRARY_PACK});
  if (!doc?.id) throw new Error('Foundry did not confirm folder creation.');
  return doc.id;
}
async function renameNarrationFolder(pack, folderId, name) {
  if (!game.user?.isGM || pack?.locked) throw new Error('Unlock ZFT Narrations to manage folders.');
  const folder = pack?.folders?.get(folderId);
  const cleaned = String(name ?? '').trim().slice(0, 100);
  if (!folder || !cleaned) throw new Error('Choose a folder and provide a name.');
  await folder.update({name: cleaned});
}
/** Default to editing mode the first time a world loads this library. */
async function initializeNarrationLibraryLock() {
  if (!game.user?.isGM) return;
  const pack = getNarrationLibraryPack({notify:false});
  if (!pack || game.settings.get(ID, LIBRARY_INITIALIZED_KEY)) return;
  if (pack.locked) await pack.configure({locked: false});
  if (pack.locked) throw new Error('Foundry did not unlock ZFT Narrations');
  await game.settings.set(ID, LIBRARY_INITIALIZED_KEY, true);
  console.info(`${LOG} 🔓 | ZFT Narrations initialized unlocked for this world`);
}
function legacyGraphicsFolder() {
  const world = String(game.world?.id ?? '');
  if (!/^[a-z0-9_-]+$/i.test(world)) throw new Error('The active world has no safe storage ID');
  return `worlds/${world}/zft-cinematics/narration`;
}
function isLegacyGraphic(path) {
  return Boolean(safeImagePath(path) && (
    /^worlds\/[a-z0-9_-]+\/zft-cinematics\/narration\/[^/]+$/i.test(path) ||
    path.startsWith(`${PREVIOUS_SHARED_GRAPHICS}/`)));
}
function isLibraryGraphic(path) {
  return Boolean(safeImagePath(path) && path.startsWith(`${LIBRARY_GRAPHICS}/`) &&
    /\.(?:png|jpe?g|gif|webp)$/i.test(path));
}
function isManagedPath(path) { return isLibraryGraphic(path) || isLegacyGraphic(path); }
function getManagedAssets() {
  // Old world-scoped metadata is read solely for manual legacy migration.
  try { const value = game.settings.get(ID, ASSETS_KEY); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function textIncludesPath(text, path) { return typeof text === 'string' && text.includes(path); }
function assetUsedInLiveState(path) {
  const state = getState();
  if (state?.active && !stateExpired(state) &&
    (textIncludesPath(state.message, path) || textIncludesPath(state.messageHtml, path) || state.appearance?.texture===path)) return true;
  // Protect a passage currently being composed in this browser even if it
  // has not yet been saved to the compendium.
  if(Array.from(document.querySelectorAll('[data-zft-narration-editor] img[src]'))
    .some(img => img.getAttribute('src') === path))return true;
  return Array.from(document.querySelectorAll('[name="backgroundTexture"]'))
    .some(input=>input.value===path);
}
function chatReferencesAsset(path) {
  return Array.from(game.messages ?? []).some(message => textIncludesPath(message.content, path));
}
/** A dedicated internal JournalEntry keeps graphic metadata portable with the
 * shared compendium. It is excluded from the Save/Load narration picker. */
async function getGraphicIndex({ create = false, unlocked = false } = {}) {
  const pack = getNarrationLibraryPack({ notify: false });
  if (!pack) return null;
  if (unlocked && pack.locked) throw new Error('Unlock ZFT Narrations before changing graphics.');
  const docs = await pack.getDocuments();
  let entry = docs.find(doc => doc.flags?.[ID]?.graphicIndex?.schema === LIBRARY_INDEX_SCHEMA);
  if (!entry && create) {
    if (pack.locked) throw new Error('Unlock ZFT Narrations before uploading graphics.');
    entry = await JournalEntry.implementation.create({
      name: LIBRARY_INDEX_NAME,
      flags: { [ID]: { graphicIndex: { schema: LIBRARY_INDEX_SCHEMA, assets: [] } } }
    }, { pack: LIBRARY_PACK });
  }
  return entry ?? null;
}
let graphicsIndexChain = Promise.resolve();
async function getLibraryRecords() {
  const index = await getGraphicIndex();
  return (index?.flags?.[ID]?.graphicIndex?.assets ?? [])
    .filter(a => isLibraryGraphic(a.path)).map(a => ({ ...a }));
}
async function updateLibraryRecords(transform) {
  if (!game.user?.isGM) throw new Error('Only a GM may edit the graphics library');
  const update = async () => {
    const doc = await getGraphicIndex({create: true, unlocked: true});
    if (!doc) throw new Error('ZFT Narration Library is not enabled');
    const before = (doc.flags?.[ID]?.graphicIndex?.assets ?? []).filter(a => isLibraryGraphic(a.path));
    const next = transform(before.map(a => ({...a})));
    if (!Array.isArray(next)) throw new Error('Invalid graphics index update');
    await doc.update({flags: { [ID]: {graphicIndex: {schema: LIBRARY_INDEX_SCHEMA, assets: next}}}});
    return next;
  };
  const task = graphicsIndexChain.then(update, update);
  graphicsIndexChain = task.catch(error => console.warn(`${LOG} ⚠️ | Shared graphics index update failed`, error));
  return task;
}
async function ensureGraphicsFolder() {
  if (!libraryEnabled()) throw new Error('Enable ZFT Narration Library to upload graphics.');
  const Picker = foundry.applications.apps.FilePicker.implementation;
  const folders = [`modules/${LIBRARY_MODULE}/assets`, LIBRARY_GRAPHICS];
  for (const subdir of folders) {
    try { await Picker.createDirectory('data', subdir); }
    catch (error) {
      try { await Picker.browse('data', subdir); }
      catch { throw error; }
    }
  }
  return LIBRARY_GRAPHICS;
}
async function uploadNarrationGraphic(blob) {
  if (!game.user?.isGM) throw new Error('Only the GM may upload Narrate graphics');
  if (!libraryEnabled()) throw new Error('Enable ZFT Narration Library to upload graphics.');
  if (getNarrationLibraryPack()?.locked) throw new Error('Unlock ZFT Narrations before uploading graphics.');
  if (!blob || !Object.hasOwn(IMAGE_TYPES, blob.type)) throw new Error('Use a PNG, JPEG, WebP, or GIF image');
  if (blob.size > ASSET_MAX_BYTES) throw new Error('Images must be 8 MB or smaller');
  const folder = await ensureGraphicsFolder();
  const name = `narrate-${Date.now()}-${foundry.utils.randomID(8)}.${IMAGE_TYPES[blob.type]}`;
  const file = new File([blob], name, {type: blob.type});
  const result = await foundry.applications.apps.FilePicker.implementation.upload('data', folder, file, {}, {notify: false});
  const path = safeImagePath(result?.path);
  if (!isLibraryGraphic(path)) throw new Error('Foundry did not confirm an upload into the narration library');
  const now = Date.now();
  try {
    await updateLibraryRecords(items => [...items, {path, uploadedAt: now, lastUsedAt: now, size: file.size, keep: false}]);
  } catch (error) {
    ui.notifications?.warn('Image uploaded, but its library tracking could not be saved. Review Graphics Library.');
    console.warn(`${LOG} ⚠️ | Uploaded file not indexed: ${path}`, error);
  }
  return path;
}
/** Reuse refreshes the seven-day review clock without permanently pinning the
 * graphic. Saved narration references are protected by scanning the compendium. */
async function noteManagedAssetsUsed(html) {
  if (!game.user?.isGM || !html || !libraryEnabled()) return;
  const pack = getNarrationLibraryPack({notify:false});
  if (!pack || pack.locked) return;
  const now = Date.now();
  const paths = extractImagePaths(html).filter(isLibraryGraphic);
  if (!paths.length) return;
  await updateLibraryRecords(items => items.map(a => paths.includes(a.path) ? {...a, lastUsedAt: now} : a));
}
async function retainAssetsInChat(html) { return noteManagedAssetsUsed(html); }
function extractImagePaths(html) {
  const parsed = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
  return [...new Set(Array.from(parsed.querySelectorAll('img[src]'))
    .map(img => safeImagePath(img.getAttribute('src'))).filter(Boolean))];
}
async function savedNarrationReferences() {
  const pack = getNarrationLibraryPack({notify:false});
  const refs = new Map();
  if (!pack) return refs;
  for (const entry of await pack.getDocuments()) {
    if (entry.flags?.[ID]?.narrate?.schema !== LIBRARY_SCHEMA) continue;
    for (const page of entry.pages?.contents ?? []) {
      if (page.type !== 'text') continue;
      for (const path of extractImagePaths(page.text?.content)) {
        if (!refs.has(path)) refs.set(path, new Set());
        refs.get(path).add(entry.name);
      }
    }
    const texture=safeImagePath(entry.flags?.[ID]?.narrate?.appearance?.texture);
    if(texture){if(!refs.has(texture))refs.set(texture,new Set());refs.get(texture).add(entry.name);}
  }
  return refs;
}
function assetStatus(item, refs = new Map()) {
  if (refs.has(item.path)) return 'Saved narration';
  if (item.keep) return 'Keep';
  if (assetUsedInLiveState(item.path) || chatReferencesAsset(item.path)) return 'In use';
  if (item.untracked) return 'Untracked (review)';
  const date = Number(item.lastUsedAt ?? item.uploadedAt);
  if (!Number.isFinite(date) || date <= 0) return 'Unknown age';
  return Date.now() - date >= ASSET_RETENTION_MS ? 'Review after 7 days' : 'Temporary';
}
/** Copy only files from known previous Narrate upload directories; originals
 * are never modified or deleted. A failed fetch/upload aborts that image. */
async function migrateGraphicPath(oldPath, mapping) {
  if (!isLegacyGraphic(oldPath)) return oldPath;
  if (mapping.has(oldPath)) return mapping.get(oldPath);
  const response = await fetch(oldPath, {credentials: 'same-origin'});
  if (!response.ok) throw new Error(`Cannot read original image: ${oldPath}`);
  const blob = await response.blob();
  const ext = oldPath.split('.').pop().toLowerCase();
  const mime = ({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp'})[ext];
  if (!mime) throw new Error(`Unsupported legacy image: ${oldPath}`);
  const typedBlob = new Blob([blob], {type:mime});
  const newPath = await uploadNarrationGraphic(typedBlob);
  mapping.set(oldPath, newPath);
  return newPath;
}
async function rewriteLegacyImages(html, mapping) {
  const parsed = new DOMParser().parseFromString(sanitizeNarrationHtml(html), 'text/html');
  for (const img of parsed.querySelectorAll('img[src]')) {
    const src = img.getAttribute('src');
    if (isLegacyGraphic(src)) img.setAttribute('src', await migrateGraphicPath(src, mapping));
  }
  return sanitizeNarrationHtml(parsed.body.innerHTML);
}
/** Select one shared image as a narration card background. This is NOT the
 * graphics maintenance dialog: selecting a thumbnail must be obvious and no
 * cleanup/Keep controls belong in this workflow. */
async function openNarrationBackgroundPicker(onSelect) {
  if (!game.user?.isGM || typeof onSelect!=='function') return;
  if (!getNarrationLibraryPack()) return;
  let tracked=[];
  try { tracked=await getLibraryRecords(); }
  catch(error) { ui.notifications?.error(`Narrate: cannot read graphics (${error.message}).`);return; }
  let files=[];
  try {
    const browsing=await foundry.applications.apps.FilePicker.implementation.browse('data',LIBRARY_GRAPHICS);
    files=(browsing.files??[]).map(f=>safeImagePath(typeof f==='string'?f:f.path)).filter(isLibraryGraphic);
  } catch(error) { console.info(`${LOG} ℹ️ | Shared images folder unavailable`,error); }
  const available=new Set(files);
  // Browse the actual module folder first; index-only entries may be missing.
  const choices=[...new Set([...files,...tracked.map(r=>safeImagePath(r.path)).filter(path=>path && available.has(path))])];
  let selected='';
  const cards=choices.map((path,index)=>{
    const file=path.split('/').pop()||path;
    return `<button type="button" class="zft-narration-background-choice" data-zft-background-choice="${index}" data-zft-background-search="${escapeHTML(file.toLowerCase())}" title="${escapeHTML(file)}" aria-pressed="false">
      <img src="${escapeHTML(path)}" alt="${escapeHTML(file)}" loading="lazy"><span>${escapeHTML(file)}</span>
    </button>`;
  }).join('');
  let dialog;
  dialog=new Dialog({title:'Narrate | Select Background Texture',content:`
    <section class="zft-narration-background-picker">
      <p>Choose a background texture. Graphics are not modified or deleted.</p>
      <input type="search" data-zft-background-search-field placeholder="Search backgrounds…" aria-label="Search background graphics">
      <div class="zft-narration-background-grid">${cards||'<p>No shared images available. Upload a texture from the editor first.</p>'}</div>
      <p data-zft-background-selection aria-live="polite">No background selected</p>
      <button type="button" data-zft-background-apply disabled><i class="fa-solid fa-check"></i> Use as Background</button>
    </section>`,buttons:{close:{label:'Cancel'}},default:'close',render:html=>{
      const root=html instanceof HTMLElement?html:html?.[0];if(!root)return;
      const apply=root.querySelector('[data-zft-background-apply]');
      const selectedText=root.querySelector('[data-zft-background-selection]');
      const buttons=[...root.querySelectorAll('[data-zft-background-choice]')];
      const choose=button=>{
        const i=Number(button.dataset.zftBackgroundChoice);
        selected=choices[i]||'';
        for(const candidate of buttons){
          const active=candidate===button;
          candidate.classList.toggle('selected',active);
          candidate.setAttribute('aria-pressed',String(active));
        }
        if(selectedText)selectedText.textContent=selected?`Selected: ${selected.split('/').pop()}`:'No background selected';
        if(apply)apply.disabled=!selected;
      };
      buttons.forEach(button=>{
        button.addEventListener('click',()=>choose(button));
        button.addEventListener('dblclick',()=>{choose(button);apply?.click();});
      });
      root.querySelector('[data-zft-background-search-field]')?.addEventListener('input',event=>{
        const term=event.target.value.toLowerCase().trim();
        buttons.forEach(button=>{button.hidden=!(button.dataset.zftBackgroundSearch||'').includes(term);});
      });
      apply?.addEventListener('click',()=>{
        if(!selected || !available.has(selected))return;
        onSelect(selected);
        void noteManagedAssetsUsed(`<img src="${selected}">`).catch(console.warn);
        void dialog.close();
      });
    }}, {width:790,height:650,resizable:true,classes:['zft-cinematics-narration-dialog','zft-narration-background-dialog']});
  dialog.render(true);
}
/** Shared graphics inventory plus live compendium reference protection.
 * No file removal API is available from an ordinary Foundry V13 client module. */
async function openGraphicsManager({onInsert = null} = {}) {
  if (!game.user?.isGM) return;
  const pack = getNarrationLibraryPack();
  if (!pack) return;
  let refs, records;
  try { [refs, records] = await Promise.all([savedNarrationReferences(), getLibraryRecords()]); }
  catch (error) {ui.notifications?.error(`Narrate: could not read library (${error.message}).`);return;}
  const known = new Set(records.map(a => a.path));
  let sharedFiles = [];
  try {
    const data = await foundry.applications.apps.FilePicker.implementation.browse('data',LIBRARY_GRAPHICS);
    sharedFiles = (data.files ?? []).map(f => safeImagePath(typeof f === 'string' ? f : f.path)).filter(isLibraryGraphic);
    for (const path of sharedFiles) {
      if (known.has(path)) continue;
      records.push({path, uploadedAt:0, lastUsedAt:0, size:0, keep:false, untracked:true});
      known.add(path);
    }
  } catch (error) { console.info(`${LOG} ℹ️ | Graphics directory not yet created`, error); }
  const diskPaths = new Set(sharedFiles);
  const missing = [...refs.entries()].filter(([path]) => isLibraryGraphic(path) && !diskPaths.has(path));
  const eligible = records.filter(a => assetStatus(a,refs) === 'Review after 7 days');
  const total = records.reduce((n,a) => n+(Number(a.size)||0),0);
  const cards = records.map((item,i) => {
    const status = assetStatus(item,refs);
    const file = item.path.split('/').pop() || item.path;
    const count = refs.get(item.path)?.size ?? 0;
    const when = Number(item.lastUsedAt ?? item.uploadedAt);
    const last = Number.isFinite(when) && when > 0 ? new Date(when).toLocaleDateString() : 'Unknown';
    const issue = !diskPaths.has(item.path);
    return `<article class="zft-narration-asset-card" data-zft-asset-card data-zft-asset-search="${escapeHTML(file.toLowerCase())}">
      <div class="zft-narration-asset-thumbnail"><img src="${escapeHTML(item.path)}" alt="${escapeHTML(file)}" loading="lazy"></div>
      <div class="zft-narration-asset-details">
        <strong title="${escapeHTML(item.path)}">${escapeHTML(file)}</strong>
        <small>${Math.ceil((Number(item.size)||0)/1024)} KB · Used ${escapeHTML(last)}</small>
        <small class="zft-narration-asset-status">${escapeHTML(issue?'File missing':status)} · ${count} saved reference${count===1?'':'s'}</small>
        ${count ? `<small title="${escapeHTML([...refs.get(item.path)].join(', '))}">${escapeHTML([...refs.get(item.path)].slice(0,2).join(', '))}</small>` : ''}
        <div class="zft-narration-asset-actions">
          ${onInsert && !issue ? `<button type="button" data-zft-asset-insert="${i}">Insert</button>` : ''}
          <label><input type="checkbox" data-zft-asset-keep="${i}" ${item.keep?'checked':''} ${pack.locked?'disabled':''}> Keep</label>
           <label class="zft-narration-cleanup-choice" title="${escapeHTML(issue ? 'Missing file' : status === 'Review after 7 days' ? 'Eligible for cleanup review' : `Protected: ${status}`)}">
             <input type="checkbox" data-zft-cleanup-select="${i}" ${status === 'Review after 7 days' && !issue ? '' : 'disabled'}> ${status !== 'Review after 7 days' || issue ? '<i class="fa-solid fa-ban zft-narration-cleanup-blocked" aria-hidden="true"></i>' : ''} Select for cleanup
           </label>
        </div>
      </div>
    </article>`;
  }).join('');
  const issues = missing.length ? `<details class="zft-narration-missing-report"><summary>Missing images in saved narration (${missing.length})</summary><ul>${missing.map(([path,names])=>`<li>${escapeHTML(path)}: ${escapeHTML([...names].join(', '))}</li>`).join('')}</ul></details>` : '';
  const content = `<div class="zft-narration-graphics-library">
    <p class="zft-narration-library-intro">${records.length} graphics · ${(total/(1024*1024)).toFixed(2)} MB tracked · ${eligible.length} cleanup candidates · ${missing.length} missing shared image${missing.length===1?'':'s'}.</p>
    <p class="zft-narration-library-intro">${pack.locked?'Unlock ZFT Narrations to upload or change Keep.':'Saved passages protect referenced graphics automatically.'}</p>
    <label class="zft-narration-library-search-label" for="zft-narration-graphics-search">Find graphic</label>
    <input id="zft-narration-graphics-search" type="search" data-zft-graphics-search placeholder="Search by filename…" autocomplete="off">
    <div class="zft-narration-asset-gallery" data-zft-asset-gallery>${cards||'<p>No graphics in the library. Upload one in Narrate.</p>'}</div>
    <p class="zft-narration-asset-empty" data-zft-asset-no-results hidden>No matching graphics.</p>
    ${issues}
    <div class="zft-narration-maintenance-actions">
       <button type="button" data-zft-cleanup-list disabled>Review Selected Cleanup (0)</button>
    </div>
    <p class="zft-narration-library-notice">Saved references, Keep, and live content protect graphics. Unreferenced graphics become eligible after seven days. Only eligible graphics may be selected for cleanup review. This creates a manual file list; <strong>no files are deleted automatically</strong>.</p>
  </div>`;
  let dialog;
  dialog = new Dialog({title:'Narrate | Graphics Library & Maintenance',content,
    buttons:{
      save:{label:'Save Keep Choices', callback: html => {
        const root = html instanceof HTMLElement ? html : html?.[0];
        if (pack.locked) {ui.notifications?.warn('Unlock ZFT Narrations to save Keep choices.');return;}
        const checked = new Set([...root.querySelectorAll('[data-zft-asset-keep]:checked')]
          .map(el=>records[Number(el.dataset.zftAssetKeep)]?.path).filter(Boolean));
        const visible = new Set(records.map(a=>a.path));
        void updateLibraryRecords(items=>{
          const out=items.map(a=>visible.has(a.path)?{...a,keep:checked.has(a.path)}:a);
          for (const a of records) if (a.untracked && checked.has(a.path) && !out.some(b=>b.path===a.path))
            out.push({path:a.path,uploadedAt:Date.now(),lastUsedAt:Date.now(),size:0,keep:true});
          return out;
        }).catch(error=>ui.notifications?.error(`Narrate: cannot save Keep (${error.message}).`));
      }},
      close:{label:'Close'}
    }, default:'close',
    render: html => {
      const root = html instanceof HTMLElement ? html : html?.[0];
      if (!root) return;
      const search = root.querySelector('[data-zft-graphics-search]');
      const empty = root.querySelector('[data-zft-asset-no-results]');
      search?.addEventListener('input',()=>{
        const q=search.value.trim().toLowerCase();let count=0;
        for(const card of root.querySelectorAll('[data-zft-asset-card]')){ card.hidden=!(card.dataset.zftAssetSearch??'').includes(q);if(!card.hidden) count++; }
        if(empty) empty.hidden = count>0 || !records.length;
      });
      root.querySelectorAll('[data-zft-asset-insert]').forEach(button=>button.addEventListener('click',()=>{
        const a=records[Number(button.dataset.zftAssetInsert)];
        if(!a || !isLibraryGraphic(a.path) || !onInsert)return;
        try {onInsert(a.path);void noteManagedAssetsUsed(`<img src="${a.path}">`).catch(console.warn);void dialog.close();}
        catch(error){ui.notifications?.warn(`Narrate: ${error.message}`);}
      }));
      const reviewButton = root.querySelector('[data-zft-cleanup-list]');
       const updateReviewButton = () => {
         const count = root.querySelectorAll('[data-zft-cleanup-select]:checked:not(:disabled)').length;
         if (reviewButton) {
           reviewButton.disabled = count === 0;
           reviewButton.textContent = `Review Selected Cleanup (${count})`;
         }
       };
      root.querySelectorAll('[data-zft-cleanup-select]').forEach(input =>
         input.addEventListener('change', updateReviewButton));
      // An unsaved Keep change must immediately prevent a cleanup review.
      root.querySelectorAll('[data-zft-asset-keep]').forEach(input =>
        input.addEventListener('change', () => {
          const review = root.querySelector(`[data-zft-cleanup-select="${input.dataset.zftAssetKeep}"]`);
          if (review && input.checked) { review.checked = false; review.disabled = true; }
          // Unkeeping an initially protected asset still requires saving Keep
          // choices and reopening the library to recalculate current status.
          updateReviewButton();
        }));
      updateReviewButton();
      root.querySelector('[data-zft-cleanup-list]')?.addEventListener('click', async ()=>{
        const selected = [...root.querySelectorAll('[data-zft-cleanup-select]:checked')]
          .map(el=>records[Number(el.dataset.zftCleanupSelect)]).filter(a=>a && eligible.some(x=>x.path===a.path));
        if(!selected.length){ui.notifications?.warn('Select one or more eligible graphics first.');return;}
        // Re-read references just before issuing an advisory list; never infer
        // that a stale UI selection is safe for actual deletion.
        const latest=await savedNarrationReferences();
        const safe=selected.filter(a=>assetStatus(a,latest)==='Review after 7 days');
        if(!safe.length){ui.notifications?.warn('Selected files are now protected. Nothing to review.');return;}
        const paths=safe.map(a=>a.path).join('\n');
        const confirm=await Dialog.confirm({title:`Prepare cleanup list (${safe.length})`,content:`<p>These files are unreferenced and older than seven days. Foundry does not expose a supported client file deletion API. This action only displays paths for manual server maintenance; it does NOT delete files.</p>`,yes:()=>true,no:()=>false,defaultYes:false});
        if(!confirm)return;
        new Dialog({title:'Manual Cleanup Paths',content:`<p>Back up first. Stop Foundry before deleting files on the server. Recheck for references after edits.</p><textarea readonly rows="9" style="width:100%">${escapeHTML(paths)}</textarea>`,buttons:{close:{label:'Close'}}}).render(true);
      });
      root.querySelectorAll('.zft-narration-asset-thumbnail img').forEach(img=>img.addEventListener('error',()=>{img.classList.add('is-missing');img.alt='Image unavailable';}));
    }
  },{width:850,height:730,resizable:true,classes:['zft-cinematics-narration-dialog','zft-narration-library-dialog']});
  dialog.render(true);
}
/**
 * Reduce editor/browser HTML to a strict, text-only markup vocabulary.
 * Do not trust GM-sent raw HTML or a player-authored ChatMessage flag.
 * In particular, no style, event, href, src, or arbitrary class survives.
 */
function sanitizeNarrationHtml(source) {
  const input = String(source ?? '').slice(0, MAX_RICH_HTML);
  if (!input) return '';
  const parsed = new DOMParser().parseFromString(input, 'text/html');
  const blocked = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG',
    'MATH', 'VIDEO', 'AUDIO', 'FORM', 'INPUT', 'BUTTON', 'META', 'LINK', 'TEMPLATE']);
  const output = document.createElement('div');
  const availableFonts = new Set(getAvailableNarrationFonts());
  const safeAlign = element => {
    const cls = Array.from(element.classList ?? []).find(c => SAFE_ALIGN_CLASSES.has(c));
    if (cls) return cls;
    const match = element.getAttribute('style')?.match(/(?:^|;)\s*text-align\s*:\s*(left|center|right)\s*(?:;|$)/i);
    return match ? `zft-narration-align-${match[1].toLowerCase()}` : '';
  };
  const safeFont = element => {
    const legacy = Array.from(element.classList ?? []).find(c =>
      SAFE_SPAN_CLASSES.has(c) && c.startsWith('zft-narration-font-'));
    const css = element.getAttribute('style')?.match(/(?:^|;)\s*font-family\s*:\s*([^;]+)/i)?.[1];
    const candidate = (element.getAttribute('data-zft-narration-font') ??
      element.getAttribute('face') ?? css ?? '').trim();
    // Browser execCommand may quote font face names. Only loaded/registered
    // Foundry font family names may survive serialization.
    const cleaned = candidate.replace(/^["']|["']$/g, '').trim();
    return { family: availableFonts.has(cleaned) ? cleaned : '', legacy: legacy ?? '' };
  };
  const safeSize = element => {
    const existing = Array.from(element.classList ?? []).find(c => SAFE_SPAN_CLASSES.has(c) && c.startsWith('zft-narration-size-'));
    if (existing) return existing;
    const number = element.getAttribute('size');
    if (Object.hasOwn(SAFE_SIZE_CLASSES, number)) return `zft-narration-size-${SAFE_SIZE_CLASSES[number]}`;
    return '';
  };
  const recurse = (node, parent) => {
    if (node.nodeType === 3) { parent.append(document.createTextNode(node.nodeValue)); return; }
    if (node.nodeType !== 1 || blocked.has(node.tagName)) return;
    const tag = node.tagName;
    if (tag === 'BR') { parent.append(document.createElement('br')); return; }
    if (tag === 'IMG') {
      const src = safeImagePath(node.getAttribute('src'));
      if (!src) return;
      const img = document.createElement('img');
      img.src = src;
      img.alt = String(node.getAttribute('alt') ?? '').slice(0, 150);
      const width = Array.from(node.classList ?? []).find(c => /^zft-narration-image-(25|50|75|100)$/.test(c))?.split('-').at(-1) ?? '75';
      const align = Array.from(node.classList ?? []).find(c => /^zft-narration-image-(left|center|right)$/.test(c))?.split('-').at(-1) ?? 'center';
      img.className = `zft-narration-image zft-narration-image-${width} zft-narration-image-${align}`;
      img.loading = 'lazy';
      parent.append(img);
      return;
    }
    let target = parent;
    if (tag === 'STRONG' || tag === 'B') target = document.createElement('strong');
    else if (tag === 'EM' || tag === 'I') target = document.createElement('em');
    else if (tag === 'U') target = document.createElement('u');
    else if (tag === 'DIV' || tag === 'P' || /^H[1-3]$/.test(tag)) {
      const isDocument = tag === 'DIV' && node.classList.contains('zft-narration-document');
      target = document.createElement(isDocument ? 'div' : 'p');
      const align = safeAlign(node);
      const heading = /^H[1-3]$/.test(tag) ? `zft-narration-heading-${tag[1]}` : Array.from(node.classList ?? []).find(c => SAFE_HEADING_CLASSES.has(c));
      const classes = [isDocument ? 'zft-narration-document' : '', align, !isDocument ? heading : ''].filter(Boolean);
      if (classes.length) target.className = classes.join(' ');
      if (isDocument) {
        const font = safeFont(node);
        if (font.family) target.dataset.zftNarrationFont = font.family;
        const size = node.getAttribute('data-zft-narration-size');
        if (Object.hasOwn(SAFE_SIZE_CLASSES, size)) target.classList.add(`zft-narration-size-${SAFE_SIZE_CLASSES[size]}`);
      }
    } else if (tag === 'SPAN' || tag === 'FONT' || tag === 'MARK') {
      const font = safeFont(node);
      const classes = [font.legacy, safeSize(node)].filter(Boolean);
      // Extract only validated hexadecimal colors from browser formatting or our
      // own editor controls. No arbitrary CSS, URL, or style attribute survives.
      const inline=node.getAttribute('style') || '';
      const color=inline.match(/(?:^|;)\s*color\s*:\s*(#[0-9a-fA-F]{3,6}|rgba?\([^;]+\))(?=\s*(?:;|$))/i)?.[1]
        ?? node.getAttribute('color') ?? node.getAttribute('data-zft-fg');
      const highlight=inline.match(/(?:^|;)\s*background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,6}|rgba?\([^;]+\))(?=\s*(?:;|$))/i)?.[1]
        ?? node.getAttribute('data-zft-bg') ?? (tag==='MARK'?'#fff0a0':'');
      const fg=safeHex(color,'');const bg=safeHex(highlight,'');
      if (classes.length || font.family || fg || bg) {
        target = document.createElement('span');
        if (classes.length) target.className = classes.join(' ');
        if (font.family) target.dataset.zftNarrationFont = font.family;
        if(fg) {target.style.color=fg;target.dataset.zftFg=fg;}
        if(bg) {target.style.backgroundColor=bg;target.dataset.zftBg=bg;}
      }
    }
    if (target !== parent) parent.append(target);
    for (const child of node.childNodes) recurse(child, target);
  };
  for (const node of parsed.body.childNodes) recurse(node, output);
  return output.innerHTML;
}
/**
 * Convert common markdown from clipboard plain text to safe editor markup.
 * No clipboard HTML is ever trusted. Unsupported syntax remains literal text.
 * The broadcast path still re-sanitizes this output independently.
 */
function hasNarrationMarkdown(text) {
  return /(?:^|\n)\s{0,3}#{1,3}\s+\S|\*\*(?=\S)[^\n]+?\*\*|__(?=\S)[^\n]+?__|(?<!\*)\*(?!\*)(?=\S)[^*\n]+?\*(?!\*)/m.test(text);
}
function markdownInlineToHtml(text) {
  let safe = foundry.utils.escapeHTML(text);
  safe = safe.replace(/\*\*(?=\S)(.+?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/__(?=\S)(.+?\S)__/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(?=\S)([^*\n]*?\S)\*(?!\*)/g, '<em>$1</em>')
    .replace(/(?<!\w)_(?=\S)([^_\n]*?\S)_(?!\w)/g, '<em>$1</em>');
  return safe;
}
function markdownToEditorHtml(input) {
  const text = String(input ?? '').replace(/\r\n?/g, '\n').slice(0, MAX_NARRATION_TEXT);
  const blocks = text.split(/\n\s*\n/).filter(part => part.trim());
  return blocks.map(block => {
    const lines = block.split('\n');
    const heading = lines[0]?.match(/^\s{0,3}(#{1,3})\s+(.+?)\s*$/);
    if (heading) {
      const result = [`<p class="zft-narration-heading-${heading[1].length}">${markdownInlineToHtml(heading[2])}</p>`];
      if (lines.length > 1) result.push(`<p>${lines.slice(1).map(markdownInlineToHtml).join('<br>')}</p>`);
      return result.join('');
    }
    return `<p>${lines.map(markdownInlineToHtml).join('<br>')}</p>`;
  }).join('');
}
function normalizeType(value) {
  return TYPES.includes(value) ? value : 'narration';
}
function normalizeDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(Math.max(3, Math.min(MAX_DURATION, n)));
}
function normalizeRequest(value) {
  const src = typeof value === 'string' ? { message: value } : (value ?? {});
  const request = {
    type: normalizeType(src.type),
    title: String(src.title ?? '').trim().slice(0, 240),
    message: String(src.message ?? '').trim().slice(0, MAX_NARRATION_TEXT),
    messageHtml: typeof src.messageHtml === 'string' ? src.messageHtml.slice(0, MAX_RICH_HTML) : '',
    duration: normalizeDuration(src.duration),
    postChat: src.postChat === undefined ? true : src.postChat === true,
    scrollSpeed: narrationScrollSpeed(src.scrollSpeed), scrollMode: normalizeScrollMode(src.scrollMode),
    transition: normalizeTransition(src.transition), transitionDuration: normalizeTransitionDuration(src.transitionDuration),
    appearance:normalizeAppearance(src.appearance)
  };
  if (!request.title && !request.message && !sanitizeNarrationHtml(request.messageHtml).includes('<img ')) return null;
  if (!['title', 'announcement'].includes(request.type)) request.title = '';
  if (!request.title && !request.message && !sanitizeNarrationHtml(request.messageHtml).includes('<img ')) return null;
  return request;
}
function cleanRequest(raw) {
  const normalized = normalizeRequest(raw);
  if (!normalized) return null;
  return {
    type: normalized.type,
    title: escapeText(normalized.title),
    message: normalized.messageHtml
      ? (sanitizeNarrationHtml(normalized.messageHtml) || escapeText(normalized.message))
      : escapeText(normalized.message),
    duration: normalized.duration,
    postChat: normalized.postChat, scrollSpeed: normalized.scrollSpeed,scrollMode:normalized.scrollMode,
    transition:normalized.transition,transitionDuration:normalized.transitionDuration,
    appearance:normalized.appearance
  };
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
    <article class="zft-cinematics-narration-card" role="status">
      <div class="zft-cinematics-narration-scroll">
        <header class="zft-cinematics-narration-title"></header>
        <div class="zft-cinematics-narration-content"></div>
      </div>
    </article>
    <button class="zft-narration-scroll-control" type="button" data-zft-scroll-toggle hidden aria-label="Pause automatic scrolling">Pause Scroll</button>
    <footer class="zft-cinematics-narration-controls" role="toolbar" aria-label="GM narration controls">
      <label class="zft-narration-live-speed" title="Change scrolling speed (GM only)">Speed
        <input data-zft-live-speed type="number" min="1" max="120" step="1" value="25" aria-label="GM scrolling speed in pixels per second"></label>
      <button type="button" data-action="edit-published-narration"><i class="fa-solid fa-pen"></i> Back to Editor</button>
      <button type="button" data-action="save-published-narration"><i class="fa-solid fa-floppy-disk"></i> Save to Library</button>
      <button type="button" data-action="close-narration">Close Narration</button>
    </footer>`;
  overlay.querySelector('[data-action="edit-published-narration"]')?.addEventListener('click',()=>{
    if(!game.user?.isGM)return;
    const state=getState();if(!state?.active)return;
    const draft=publishedDraft?.stateId===state.id ? {...publishedDraft.draft} : {
      name:'Published Narration',entryId:'',folderId:'',html:sanitizeNarrationHtml(state.message),
      type:normalizeType(state.type),title:new DOMParser().parseFromString(String(state.title??''),'text/html').body.textContent??'',
      closeMode:state.expiresAt?'timed':'manual',duration:state.expiresAt?Math.max(3,Math.ceil((state.expiresAt-state.createdAt)/1000)):DEFAULT_DURATION,
      scrollSpeed:narrationScrollSpeed(state.scrollSpeed),scrollMode:normalizeScrollMode(state.scrollMode),
      transition:normalizeTransition(state.transition),transitionDuration:normalizeTransitionDuration(state.transitionDuration),
      appearance:normalizeAppearance(state.appearance),postChat:false,fontFamily:'',fontSize:'',align:'center'
    };
    openNarrationDialog('',draft);
  });
  overlay.querySelector('[data-action="save-published-narration"]')?.addEventListener('click', () => {
    const state = getState();
    if (!state?.active || stateExpired(state)) return;
    // The same GM session retains full saved settings; fallback supports a GM
    // joining late or refreshing while a narration is already displayed.
    const draft = publishedDraft?.stateId === state.id ? {...publishedDraft.draft} : {
      name: 'Published Narration', folderId: '', entryId: '',
      html: sanitizeNarrationHtml(state.message), type: normalizeType(state.type),
      title: new DOMParser().parseFromString(String(state.title ?? ''), 'text/html').body.textContent ?? '',
      scrollSpeed: narrationScrollSpeed(state.scrollSpeed), scrollMode:normalizeScrollMode(state.scrollMode),
      transition: normalizeTransition(state.transition),transitionDuration:normalizeTransitionDuration(state.transitionDuration),
      appearance:normalizeAppearance(state.appearance),
      closeMode: state.expiresAt ? 'timed' : 'manual',
      duration: state.expiresAt ? Math.max(3, Math.ceil((state.expiresAt-state.createdAt)/1000)) : DEFAULT_DURATION,
      postChat: false, fontFamily: '', fontSize: '', align: 'center'
    };
    const pack = getNarrationLibraryPack({notify:false});
    if (!pack || pack.locked) {ui.notifications?.warn('Unlock ZFT Narrations to save this narration.');return;}
    // The public narration remains active for players while only this GM's
    // overlay is temporarily hidden behind the Save As window.
    const display = overlay.style.display;
    overlay.style.display = 'none';
    void openDraftSaveBrowser(draft, saved => {
      publishedDraft = {stateId:state.id, draft:{...draft,...saved}};
    }, () => {if(overlay.isConnected) overlay.style.display=display;});
  });
  overlay.querySelector('[data-action="close-narration"]')?.addEventListener('click', () => {
    void closeNarration().catch(error => {
      console.error(`${LOG} ❌ | Could not close narration`, error);
      ui.notifications?.error('ZFT Cinematics: could not close narration.');
    });
  });
  document.body.append(overlay);
  installDetachedGmControls(overlay);
  installNarrationScroll(overlay);
  return overlay;
}
/** Position a GM-only toolbar as an independent floating sibling to the
 * narration card. Never include the toolbar in card dimensions: GM preview
 * and the player's published card must render identically. */
function updateDetachedGmControls(overlay) {
  if (!overlay?.isConnected) return;
  // Position is solely viewport-based; narration card dimensions never affect it.
  const toolbar = overlay.querySelector(':scope > .zft-cinematics-narration-controls');
  if (toolbar) { toolbar.style.top = ''; toolbar.style.left = ''; }
}
function installDetachedGmControls(overlay) {
  overlay.zftPositionGmControls = () => updateDetachedGmControls(overlay);
}

/** Local scrolling, optionally following ephemeral GM socket packets.
 * Player wheel/drag/touch/keyboard overrides the follow stream until Follow GM is clicked.
 * In Independent mode the dev.15 Pause/Resume button remains in its exact viewport position. */
function installNarrationScroll(overlay) {
  if (overlay.zftScrollController) return overlay.zftScrollController;
  const viewport=overlay.querySelector('.zft-cinematics-narration-scroll');
  const content=overlay.querySelector('.zft-cinematics-narration-content');
  const toggle=overlay.querySelector('[data-zft-scroll-toggle]');
  const liveSpeed=overlay.querySelector('[data-zft-live-speed]');
  if (!viewport || !toggle) return null;
  let raf=0,delayTimer=0,previousTime=0,lastSent=0,trailingBroadcastTimer=0;
  let running=false,manual=false,overflow=false,position=0,speed=25;
  let identity=null,destroyed=false,mode='independent',leader=false,following=false;
  let lastProgress=0,remoteSpeed=25,remoteRunning=false;
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  const active=()=>!destroyed && overlay.isConnected && overlay.classList.contains('active');
  const maxScroll=()=>Math.max(0,viewport.scrollHeight-viewport.clientHeight);
  const atEnd=()=>viewport.scrollTop>=maxScroll()-1;
  const stop=()=>{
    if (raf) window.cancelAnimationFrame(raf);
    if (delayTimer) window.clearTimeout(delayTimer);
    raf=delayTimer=0;previousTime=0;running=false;
  };
  const broadcast=(force=false)=>{
    if (!leader || mode!=='follow-gm' || !active()) return;
    const now=Date.now();
    if (!force && now-lastSent<SCROLL_SYNC_INTERVAL_MS) {
      if(!trailingBroadcastTimer){
        trailingBroadcastTimer=window.setTimeout(()=>{
          trailingBroadcastTimer=0;broadcast(true);
        },SCROLL_SYNC_INTERVAL_MS-(now-lastSent));
      }
      return;
    }
    if(trailingBroadcastTimer){window.clearTimeout(trailingBroadcastTimer);trailingBroadcastTimer=0;}
    lastSent=now;
    const state=getState();
    if (!state?.active || state.gmId!==game.user?.id || identity!==narrationStateKey(state)) return;
    lastProgress=maxScroll()>0?Math.max(0,Math.min(1,viewport.scrollTop/maxScroll())):0;
    sendNarrationScroll({kind:'progress',gmId:state.gmId,key:identity,
      progress:lastProgress,running,speed,when:now});
  };
  const syncButton=()=>{
    overflow=active() && maxScroll()>2;
    toggle.hidden=!overflow;
    if (!overflow) {stop();return;}
    const label=mode==='follow-gm' && !leader ? (following?'Pause Follow':'Follow GM')
      : running?'Pause Scroll':atEnd()?'Restart Scroll':'Resume Scroll';
    toggle.textContent=label;
    toggle.setAttribute('aria-label',label);
    toggle.setAttribute('aria-pressed',String(mode==='follow-gm'&&!leader ? !following : !running));
    toggle.title=mode==='follow-gm'&&!leader
      ? (following?'Take independent control of scrolling':'Rejoin the GM’s current scroll position')
      : (running?'Pause automatic scrolling':'Continue automatic scrolling from this position');
  };
  const frame=now=>{
    raf=0;
    if (!running||!active()||!overflow){stop();syncButton();return;}
    if (previousTime) position+=speed*Math.min(75,now-previousTime)/1000;
    viewport.scrollTop=position;
    previousTime=now;
    if (leader) broadcast();
    if (atEnd()){manual=true;stop();syncButton();if(leader)broadcast(true);return;}
    raf=window.requestAnimationFrame(frame);
  };
  const play=({restartAtEnd=false}={})=>{
    if (!active() || (mode==='follow-gm'&&!leader)) return;
    if(restartAtEnd&&atEnd())viewport.scrollTop=0;
    manual=false;stop();position=viewport.scrollTop;syncButton();
    if(!overflow)return;
    running=true;syncButton();raf=window.requestAnimationFrame(frame);
    if(leader)broadcast(true);
  };
  const takeControl=()=>{
    if(!active()||!overflow)return;
    if(mode==='follow-gm'&&!leader){following=false;manual=true;syncButton();return;}
    manual=true;stop();syncButton();if(leader)broadcast(true);
  };
  const applyGmPacket=packet=>{
    if(destroyed||mode!=='follow-gm'||leader||!following||packet.key!==identity||!active())return;
    const progress=Number(packet.progress);
    if(!Number.isFinite(progress)||progress<0||progress>1)return;
    lastProgress=progress;remoteSpeed=Number(packet.speed)||speed;remoteRunning=packet.running===true;
    viewport.scrollTop=maxScroll()*progress;
    position=viewport.scrollTop;syncButton();
  };
  const refresh=()=>{
    if(!active())return;
    const wasOverflow=overflow;syncButton();
    if(mode==='follow-gm'&&!leader){
      if(following){ const packet=lastGmScrollPacket.get(identity);if(packet)applyGmPacket(packet); }
      return;
    }
    // Follow GM starts PAUSED. The GM's manual scrollbar controls players; only
    // an explicit Resume starts GM-led automatic movement. Independent mode
    // continues to auto-scroll after its normal short reading delay.
    if(overflow&&!wasOverflow&&!manual&&!reduced()&&mode==='independent'){
      delayTimer=window.setTimeout(()=>{delayTimer=0;if(!manual)play();},SCROLL_START_DELAY_MS);
    }
  };
  const reset=(key,speedChoice='normal',scrollMode='independent')=>{
    const nextMode=normalizeScrollMode(scrollMode);
    const state=overlay.id===OVERLAY_ID?getState():null;
    const nextLeader=nextMode==='follow-gm' && (overlay.id===PREVIEW_OVERLAY_ID || game.user?.id===state?.gmId);
    const fresh=key!==identity;
    speed=narrationPixelsPerSecond(speedChoice);
    if(liveSpeed)liveSpeed.value=String(speed);
    mode=nextMode;leader=nextLeader;
    if(!fresh){refresh();return;}
    identity=key;lastSent=0;following=mode==='follow-gm'&&!leader;
    manual=reduced() || following || (mode==='follow-gm' && leader);
    stop();viewport.scrollTop=0;position=0;
    window.requestAnimationFrame(()=>{
      if(destroyed||identity!==key)return;
      refresh();
      if(following && state?.active && mode==='follow-gm'){
        const packet=lastGmScrollPacket.get(key);
        if(packet)applyGmPacket(packet);
        sendNarrationScroll({kind:'request',key,gmId:state.gmId});
      }
    });
  };
  const disable=()=>{identity=null;manual=false;following=false;overflow=false;stop();if(trailingBroadcastTimer)window.clearTimeout(trailingBroadcastTimer);trailingBroadcastTimer=0;toggle.hidden=true;};
  const onScroll=()=>{
    if(!active())return;
    if(leader&&mode==='follow-gm')broadcast();
    if(running && Math.abs(viewport.scrollTop-position)>3)takeControl();
    else if(!running)syncButton();
  };
  const onWheel=()=>takeControl();
  const onPointer=event=>{if(event.pointerType!=='touch')takeControl();};
  const onTouch=()=>takeControl();
  const onKey=event=>{
    if(!active()||!overflow||!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))return;
    if(event.target?.closest?.('input,textarea,select,[contenteditable="true"],button,a,[role="button"]'))return;
    takeControl();event.preventDefault();
    switch(event.key){
      case 'ArrowDown':viewport.scrollTop+=42;break;
      case 'ArrowUp':viewport.scrollTop-=42;break;
      case 'PageDown':viewport.scrollTop+=viewport.clientHeight*.85;break;
      case 'PageUp':viewport.scrollTop-=viewport.clientHeight*.85;break;
      case 'Home':viewport.scrollTop=0;break;
      case 'End':viewport.scrollTop=viewport.scrollHeight;break;
      case ' ':viewport.scrollTop+=event.shiftKey?-viewport.clientHeight:viewport.clientHeight;break;
    }
    if(leader)broadcast(true);
    syncButton();
  };
  viewport.addEventListener('scroll',onScroll,{passive:true});
  viewport.addEventListener('wheel',onWheel,{passive:true});
  viewport.addEventListener('pointerdown',onPointer,{passive:true});
  viewport.addEventListener('touchstart',onTouch,{passive:true});
  window.addEventListener('keydown',onKey);
  toggle.addEventListener('click',()=>{
    if(mode==='follow-gm'&&!leader){
      following=!following;manual=!following;
      if(following){
        const packet=lastGmScrollPacket.get(identity);
        if(packet)applyGmPacket(packet);
        const state=getState();if(state?.active)sendNarrationScroll({kind:'request',key:identity,gmId:state.gmId});
      }
      syncButton();return;
    }
    if(running)takeControl();else play({restartAtEnd:true});
  });
  liveSpeed?.addEventListener('change',()=>{
    const n=Number(liveSpeed.value);
    if(!Number.isFinite(n)||n<1||n>120){liveSpeed.value=String(speed);return;}
    speed=Math.round(n);liveSpeed.value=String(speed);
    if(previewSession?.root && overlay.id===PREVIEW_OVERLAY_ID){
      applyScrollSpeedInputs(previewSession.root,`custom:${speed}`);
      previewSession.draft.scrollSpeed=`custom:${speed}`;
      previewSession.request.scrollSpeed=`custom:${speed}`;
    }
    if(publishedDraft?.draft && overlay.id===OVERLAY_ID)publishedDraft.draft.scrollSpeed=`custom:${speed}`;
    if(leader)broadcast(true);
  });
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(refresh):null;
  observer?.observe(viewport);if(content)observer?.observe(content);
  const onImageLoad=()=>refresh();
  content?.addEventListener('load',onImageLoad,true);
  const destroy=()=>{
    destroyed=true;disable();observer?.disconnect();
    viewport.removeEventListener('scroll',onScroll);
    viewport.removeEventListener('wheel',onWheel);
    viewport.removeEventListener('pointerdown',onPointer);
    viewport.removeEventListener('touchstart',onTouch);
    content?.removeEventListener('load',onImageLoad,true);
    window.removeEventListener('keydown',onKey);
  };
  overlay.zftScrollController={reset,disable,refresh,destroy,broadcast,applyGmPacket,
    getStatus:()=>({running,manual,overflow,following,mode,leader,speed,scrollTop:viewport.scrollTop})};
  return overlay.zftScrollController;
}

/** A separate GM-only DOM overlay. Unlike the published overlay, preview
 * never touches narrationState, chat, sockets, or the world expiry timer. */
function buildPreviewOverlay() {
  let overlay = document.getElementById(PREVIEW_OVERLAY_ID);
  if (overlay) return overlay;
  overlay = document.createElement('section');
  overlay.id = PREVIEW_OVERLAY_ID;
  overlay.className = 'zft-cinematics-narration-overlay zft-narration-preview gm-control active';
  overlay.setAttribute('aria-label', 'GM-only narration preview');
  overlay.innerHTML = `<div class="zft-cinematics-narration-backdrop"></div>
    <article class="zft-cinematics-narration-card" role="region" aria-label="Narration preview">
      <div class="zft-cinematics-narration-scroll">
        <header class="zft-cinematics-narration-title"></header>
        <div class="zft-cinematics-narration-content"></div>
      </div>
    </article>
    <button class="zft-narration-scroll-control" type="button" data-zft-scroll-toggle hidden aria-label="Pause automatic scrolling">Pause Scroll</button>
    <footer class="zft-cinematics-narration-controls" role="toolbar" aria-label="GM preview controls">
      <span class="zft-narration-preview-heading"><i class="fa-solid fa-eye"></i> GM Preview · Not visible to players</span>
      <label class="zft-narration-live-speed" title="Try a scrolling speed in preview">Speed
        <input data-zft-live-speed type="number" min="1" max="120" step="1" value="25" aria-label="Preview scrolling speed in pixels per second"></label>
      <button type="button" data-action="preview-back"><i class="fa-solid fa-arrow-left"></i> Back to Editor</button>
      <button type="button" data-action="preview-save"><i class="fa-solid fa-floppy-disk"></i> Save to Library</button>
      <button type="button" data-action="preview-publish"><i class="fa-solid fa-bullhorn"></i> Publish</button>
      <button type="button" data-action="preview-close">Close Preview</button>
    </footer>`;
  overlay.querySelector('[data-action="preview-back"]')?.addEventListener('click', () => closePreview({returnToEditor:true}));
  overlay.querySelector('[data-action="preview-close"]')?.addEventListener('click', () => closePreview({returnToEditor:true}));
  overlay.querySelector('[data-action="preview-save"]')?.addEventListener('click', () => {
    if (!previewSession) return;
    const preview = document.getElementById(PREVIEW_OVERLAY_ID);
    const pack = getNarrationLibraryPack({notify:false});
    if (!pack || pack.locked) {ui.notifications?.warn('Unlock ZFT Narrations to save this preview.');return;}
    if (preview) preview.style.display = 'none';
    void openDraftSaveBrowser(previewSession.draft, saved => {
      if (previewSession) {
        const session = previewSession;
        session.draft = {...session.draft,...saved};
        if (saved.portableHtml) {
          // Saving a legacy image may copy it to the shared library. Publish the
          // migrated URL, not the original world-specific URL from the preview.
          const html = new DOMParser().parseFromString(session.request.messageHtml,'text/html');
          const documentNode = html.querySelector('.zft-narration-document');
          if (documentNode) {
            documentNode.innerHTML = saved.portableHtml;
            session.request.messageHtml = documentNode.outerHTML;
          }
          const editor = session.root?.querySelector('[data-zft-narration-editor]');
          if (editor) {editor.innerHTML = saved.portableHtml;applyNarrationFonts(editor);}
          const display = cleanRequest(session.request);
          if (preview?.isConnected && display) {
            preview.querySelector('.zft-cinematics-narration-content').innerHTML = display.message;
            applyNarrationFonts(preview);
          }
        }
      }
      if (previewSession?.root) {updateEditorSavedIdentity(previewSession.root, saved);
        applyAppearanceInputs(previewSession.root,saved.appearance);}
    }, () => {if (preview?.isConnected) preview.style.display = '';});
  });
  overlay.querySelector('[data-action="preview-publish"]')?.addEventListener('click', async event => {
    if (!previewSession || !game.user?.isGM) return;
    const button = event.currentTarget;
    if (button.disabled) return;
    button.disabled = true;
    const session = previewSession;
    try {
      const published = await narrate(session.request);
      if (published !== true) return;
      publishedDraft = {stateId:getState()?.id, draft:{...session.draft}};
      closePreview({returnToEditor:false});
      await session.dialog?.close();
    } catch (error) {
      console.error(`${LOG} ❌ | Preview publish failed`, error);
      ui.notifications?.error(`Narrate: Publish failed (${error.message}).`);
    } finally {button.disabled = false;}
  });
  document.body.append(overlay);
  installDetachedGmControls(overlay);
  installNarrationScroll(overlay);
  return overlay;
}
function closePreview({returnToEditor = true} = {}) {
  const session = previewSession;
  previewSession = null;
  const preview = document.getElementById(PREVIEW_OVERLAY_ID);
  preview?.zftScrollController?.destroy();
  preview?.zftRemoveControlsListener?.();
  preview?.remove();
  if (returnToEditor && session?.editorElement?.isConnected) {
    session.editorElement.style.display = session.previousDisplay;
    session.editorElement.style.visibility = session.previousVisibility;
    session.root?.querySelector('[data-zft-narration-editor]')?.focus();
  }
}
function showPreview(dialog, root, request, draft) {
  if (!game.user?.isGM) {
    ui.notifications?.warn('Narrate: Preview is available to the GM only.'); return false;
  }
  if (previewSession) closePreview({returnToEditor:true});
  const display = cleanRequest(request);
  if (!display) {ui.notifications?.warn('Enter narration text or an illustration first.');return false;}
  const windowEl = dialog?.element?.[0] ?? dialog?.element;
  if (!(windowEl instanceof HTMLElement)) {
    ui.notifications?.error('Narrate: could not locate the editor window for Preview.');return false;
  }
  const overlay = buildPreviewOverlay();
  overlay.querySelector('.zft-cinematics-narration-title').innerHTML = display.title;
  overlay.querySelector('.zft-cinematics-narration-content').innerHTML = display.message;
  overlay.querySelector('.zft-cinematics-narration-title').hidden = !display.title;
  overlay.querySelector('.zft-cinematics-narration-content').hidden = !display.message;
  overlay.dataset.presentation = display.type;
  applyNarrationTransition(overlay,display.transition,display.transitionDuration);
  applyNarrationAppearance(overlay,display.appearance);
  replayNarrationEntrance(overlay);
  applyNarrationFonts(overlay);
  overlay.zftScrollController?.reset('preview',display.scrollSpeed,display.scrollMode);
  overlay.zftPositionGmControls?.();
  previewSession = {dialog, root, request, draft, editorElement:windowEl,
    previousDisplay:windowEl.style.display, previousVisibility:windowEl.style.visibility};
  windowEl.style.display = 'none';
  overlay.querySelector('[data-action="preview-back"]')?.focus();
  return true;
}
function updateEditorSavedIdentity(root, saved) {
  if (!root) return;
  root.dataset.zftNarrationEntryId = saved.entryId ?? '';
  root.dataset.zftNarrationEntryName = saved.name ?? '';
  root.dataset.zftNarrationFolderId = saved.folderId ?? '';
}
/** Full native-compendium Save As navigation from preview or published view. */
async function openDraftSaveBrowser(draft, onSaved = () => {}, onClosed = () => {}) {
  if (!game.user?.isGM) return;
  return openNarrationLibraryBrowser({mode:'save', defaultName:draft.name || 'Untitled Narration',
    currentId:draft.entryId || '', initialFolder:draft.folderId || '', onClose:onClosed,
    onSave:async ({name,folderId,entryId}) => {
      const data={...draft,name,folderId};
      const id=await saveNarrationEntry(data,entryId);
      const saved={name,folderId,entryId:id,appearance:normalizeAppearance(data.appearance),
        ...(data.portableHtml ? {portableHtml:data.portableHtml}: {})};
      onSaved(saved);
      ui.notifications?.info(`Narrate: saved ${name} to ZFT Narrations.`);
    }});
}
function getEditorDraftAndRequest(root,prefs) {
  root?.zftNarrationCommitSource?.();
  const value = name => root?.querySelector(`[name="${name}"]`)?.value ?? '';
  const editor = root?.querySelector('[data-zft-narration-editor]');
  const rawHtml = editor?.innerHTML ?? '';
  const align = ['left','center','right'].includes(prefs.align) ? prefs.align : 'center';
  const font = prefs.fontFamily && getAvailableNarrationFonts().includes(prefs.fontFamily)
    ? ` data-zft-narration-font="${foundry.utils.escapeHTML(prefs.fontFamily)}"` : '';
  const size = prefs.fontSize && Object.hasOwn(SAFE_SIZE_CLASSES,prefs.fontSize)
    ? ` data-zft-narration-size="${prefs.fontSize}"` : '';
  const draft = {
    name:root?.dataset.zftNarrationEntryName || value('title') || 'Untitled Narration',
    entryId:root?.dataset.zftNarrationEntryId || '',
    folderId:root?.dataset.zftNarrationFolderId || '',
    html:rawHtml,type:value('type'),title:value('title'),
    closeMode:value('closeMode'),duration:value('duration'),scrollSpeed:readScrollSpeed(root),
    scrollMode:normalizeScrollMode(value('scrollMode')),transition:normalizeTransition(value('transition')),
    transitionDuration:normalizeTransitionDuration(value('transitionDuration')),
    postChat:Boolean(root?.querySelector('[name="postChat"]')?.checked),appearance:readAppearance(root),
    fontFamily:prefs.fontFamily,fontSize:prefs.fontSize,align
  };
  const request = {
    type:draft.type,title:draft.title,
    message:editor?.innerText?.trim() ?? editor?.textContent?.trim() ?? '',
    messageHtml:`<div class="zft-narration-document zft-narration-align-${align}"${font}${size}>${rawHtml}</div>`,
    duration:draft.closeMode==='timed' ? draft.duration : 0,
    scrollSpeed:draft.scrollSpeed,scrollMode:draft.scrollMode,
    transition:draft.transition,transitionDuration:draft.transitionDuration,appearance:draft.appearance,
    postChat:draft.postChat
  };
  return {draft,request};
}

function clearExpiryTimer() {
  if (expiryTimer !== null) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
}
function stateExpired(state) {
  const expiresAt = Number(state?.expiresAt) || 0;
  return expiresAt > 0 && Date.now() >= expiresAt;
}
// An expiration is conditional on the ID so an old timer cannot dismiss a
// more recent narration. Only the primary connected GM clears world state.
async function expireIfCurrent(id, createdAt) {
  const state = getState();
  if (!state?.active || Number(state.id) !== id || Number(state.createdAt) !== createdAt || !stateExpired(state)) return false;
  if (!isPrimaryGM()) return false;
  return closeNarration({ expectedId: id, expectedCreatedAt: createdAt, requireExpired: true });
}
function scheduleExpiry(state) {
  clearExpiryTimer();
  if (!state?.active) return;
  const expiresAt = Number(state.expiresAt) || 0;
  if (expiresAt <= 0) return;
  const id = Number(state.id);
  const createdAt = Number(state.createdAt);
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) {
    if (isPrimaryGM()) void expireIfCurrent(id, createdAt).catch(error => console.error(`${LOG} ❌ | Expiration failed`, error));
    return;
  }
  expiryTimer = setTimeout(() => {
    expiryTimer = null;
    // Render the authoritative state afresh, hiding expired content on all
    // clients even if a GM is temporarily unavailable to clear the setting.
    renderState(getState());
  }, Math.min(remaining + 30, 2147483647));
}
function renderState(state = getState()) {
  const overlay = buildOverlay();
  const title = overlay.querySelector('.zft-cinematics-narration-title');
  const content = overlay.querySelector('.zft-cinematics-narration-content');
  if (!title || !content) {
    console.error(`${LOG} ❌ | Narration overlay elements missing`, { id: state?.id });
    ui.notifications?.error('ZFT Cinematics: narration overlay could not render. See console.');
    return false;
  }
  const active = Boolean(state?.active && (state?.message || state?.title) && !stateExpired(state));
  const type = normalizeType(state?.type);
  if (hideContentTimer) {clearTimeout(hideContentTimer);hideContentTimer=null;}
  const fadeOut=!active && overlay.classList.contains('active') &&
    ['fade-both','fade-black','dissolve'].includes(overlay.dataset.transition);
  if(active){
    title.innerHTML=sanitizeNarrationHtml(String(state.title ?? ''));
    content.innerHTML=sanitizeNarrationHtml(String(state.message ?? ''));
    applyNarrationFonts(content);
    title.hidden=!state?.title;content.hidden=!state?.message;
  } else if(fadeOut){
    const ms=parseFloat(overlay.style.getPropertyValue('--zft-narration-fade-duration')||'1')*1000;
    hideContentTimer=setTimeout(()=>{
      if(!overlay.classList.contains('active')){
        title.innerHTML='';content.innerHTML='';title.hidden=true;content.hidden=true;
      }
      hideContentTimer=null;
    },Math.max(100,ms+50));
  } else {title.innerHTML='';content.innerHTML='';title.hidden=true;content.hidden=true;}
  overlay.dataset.presentation = type;
  const newKey=active?narrationStateKey(state):'';
  const newNarration=active && overlay.dataset.zftRenderKey!==newKey;
  if(active){
    applyNarrationTransition(overlay,state.transition,state.transitionDuration);
    applyNarrationAppearance(overlay,state.appearance);
  }
  overlay.classList.toggle('gm-control', Boolean(game.user?.isGM));
  overlay.classList.toggle('active', active);
  if (newNarration) {
    overlay.dataset.zftRenderKey=newKey;
    replayNarrationEntrance(overlay);
  } else if (!active) delete overlay.dataset.zftRenderKey;
  if (active) {
    overlay.zftScrollController?.reset(narrationStateKey(state),state.scrollSpeed,state.scrollMode);
    if (game.user?.isGM) overlay.zftPositionGmControls?.();
  } else overlay.zftScrollController?.disable();
  scheduleExpiry(state);
  if (active) {
    if(normalizeScrollMode(state.scrollMode)==='follow-gm' && game.user?.id===state.gmId){
      setTimeout(()=>overlay.zftScrollController?.broadcast(true),250);
    }
    console.info(`${LOG} 📖 | Narration overlay rendered`, { id: state.id, type });
  }
  return true;
}

/** Save the world state before posting a GM chat card. */
async function setNarrationState(state) {
  try {
    await game.settings.set(ID, STATE_KEY, state);
  } catch (error) {
    console.error(`${LOG} ❌ | Shared narration state update failed`, {
      userId: game.user?.id, isGM: Boolean(game.user?.isGM), error
    });
    ui.notifications?.error('ZFT Cinematics: could not display shared narration. No chat card was posted.');
    throw error;
  }
  if (!renderState(state)) {
    console.error(`${LOG} ❌ | Shared narration saved but local overlay did not render`, { id: state?.id });
    ui.notifications?.error('ZFT Cinematics: narration state saved, but overlay is missing. See console.');
    return false;
  }
  return true;
}
function buildChatCard(request) {
  const labels = { narration: 'Narration', title: 'Location Title', announcement: 'Announcement', subtitle: 'Subtitle' };
  const title = request.title ? `<h3 class="zft-cinematics-narration-chat-title">${request.title}</h3>` : '';
  return `<section class="zft-cinematics-narration-chat-card">
    <header class="zft-cinematics-narration-chat-header">
      <i class="fa-solid fa-book-open"></i><strong>${labels[request.type] ?? labels.narration}</strong>
    </header>
    <div class="zft-cinematics-narration-chat-body">${title}${request.message}</div>
  </section>`;
}
function makeState(request, previous) {
  const createdAt = Date.now();
  return {
    id: Number(previous?.id ?? 0) + 1,
    active: true,
    message: request.message,
    title: request.title,
    type: request.type,
    createdAt,
    expiresAt: request.duration ? createdAt + request.duration * 1000 : 0,
    scrollSpeed: narrationScrollSpeed(request.scrollSpeed),scrollMode:normalizeScrollMode(request.scrollMode),
    gmId: game.user?.id ?? '',transition:normalizeTransition(request.transition),
    transitionDuration:normalizeTransitionDuration(request.transitionDuration),
    appearance:normalizeAppearance(request.appearance),
    paused: true
  };
}
/** This operation must run on a GM client because state is world-scoped. */
async function createNarrationAsGM(request) {
  if (!game.user?.isGM) return false;
  const next = makeState(request, getState());
  if (!await setNarrationState(next)) return false;
  await noteManagedAssetsUsed(`${request.message}<img src="${request.appearance.texture}">`).catch(error =>
    console.warn(`${LOG} ⚠️ | Could not record Narrate graphic usage`, error));
  if (!request.postChat) return true;
  try {
    await ChatMessage.create({
      content: buildChatCard(request),
      speaker: { alias: getSetting(SPEAKER_ALIAS_KEY), scene: game.user?.viewedScene },
      flags: { [ID]: { type: CHAT_FLAG, id: next.id } }
    });
    await retainAssetsInChat(request.message);
  } catch (error) {
    console.warn(`${LOG} ⚠️ | Narration active, but chat card could not be posted`, error);
    ui.notifications?.warn('ZFT Cinematics: narration is on screen, but the chat card could not be posted.');
    return true;
  }
  console.info(`${LOG} ✅ | Narration overlay and chat card shared`, { id: next.id, type: request.type });
  return true;
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
  // Older pending requests contain only rawText; newer ones include the
  // structured rawPresentation object. Both must be treated as untrusted.
  const request = cleanRequest(message.flags[ID].rawPresentation ?? message.flags[ID].rawText);
  if (!request) return;
  const update = async () => {
    const next = makeState(request, getState());
    if (!await setNarrationState(next)) {
      console.error(`${LOG} ❌ | Player narration state saved but overlay missing`, { messageId: message.id });
      return;
    }
    await noteManagedAssetsUsed(`${request.message}<img src="${request.appearance.texture}">`).catch(error =>
      console.warn(`${LOG} ⚠️ | Could not record requested graphic usage`, error));
    console.info(`${LOG} ✅ | Player narration shared`, { id: next.id, userId: author.id, messageId: message.id });
  };
  const run = externalNarrationChain.then(update, update);
  externalNarrationChain = run.catch(() => undefined);
  await run;
}

/** Backward compatible: narrate('text'); also accepts a presentation object. */
export async function narrate(value) {
  if (!canSubmit()) return false;
  const normalized = normalizeRequest(value);
  if (!normalized) {
    ui.notifications?.warn('ZFT Cinematics: enter narration text first.');
    return false;
  }
  const request = cleanRequest(normalized);
  if (game.user.isGM) return createNarrationAsGM(request);
  if (!Array.from(game.users).some(user => user?.isGM && user.active)) {
    ui.notifications?.warn('ZFT Cinematics: an active GM is required for shared narration.');
    return false;
  }
  await ChatMessage.create({
    content: request.postChat ? buildChatCard(request) : '<p>Narration request sent to the GM (not publicly posted).</p>',
    whisper: request.postChat ? [] : Array.from(game.users).filter(user => user.isGM && user.active).map(user => user.id),
    speaker: { alias: getSetting(SPEAKER_ALIAS_KEY), scene: game.user?.viewedScene },
    flags: { [ID]: { type: CHAT_FLAG, request: true, rawText: normalized.message, rawPresentation: normalized } }
  });
  return true;
}
export async function closeNarration(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn('Only a GM can close narration for everyone.');
    return false;
  }
  const current = getState();
  if (options.expectedId !== undefined && Number(current?.id) !== options.expectedId) return false;
  if (options.expectedCreatedAt !== undefined && Number(current?.createdAt) !== options.expectedCreatedAt) return false;
  if (options.requireExpired && !stateExpired(current)) return false;
  const closed = await setNarrationState({
    id: Number(current?.id ?? 0), active: false, message: '', title: '',
    type: normalizeType(current?.type), createdAt: Number(current?.createdAt ?? Date.now()),
    expiresAt: 0, paused: true, scrollSpeed: 'normal'
  });
  if (closed) { publishedDraft = null; console.info(`${LOG} ✅ | Narration closed for everyone`, { id: current?.id }); }
  return closed;
}

/** A narration is one JournalEntry containing one text page plus settings in flags. */
const LIBRARY_SCHEMA = 1;
function libraryEntryRecord(document) {
  const meta = document?.flags?.[ID]?.narrate;
  const content = document?.pages?.contents?.find(page => page.type === 'text')?.text?.content ?? '';
  if (!meta || Number(meta.schema) !== LIBRARY_SCHEMA) return null;
  return {
    id: document.id, name: String(document.name ?? ''),
    folderId: typeof document.folder === 'string' ? document.folder : document.folder?.id ?? null,
    sort: Number(document.sort ?? 0),
    createdAt: Number(document._stats?.createdTime ?? 0),
    modifiedAt: Number(document._stats?.modifiedTime ?? 0),
    html: sanitizeNarrationHtml(content),
    type: normalizeType(meta.type), title: String(meta.title ?? '').slice(0, 240),
    closeMode: meta.closeMode === 'timed' ? 'timed' : 'manual',
    duration: normalizeDuration(meta.duration) || DEFAULT_DURATION,
    postChat: meta.postChat === true, scrollSpeed: narrationScrollSpeed(meta.scrollSpeed),
    scrollMode: normalizeScrollMode(meta.scrollMode),transition:normalizeTransition(meta.transition),
    transitionDuration: normalizeTransitionDuration(meta.transitionDuration),
    appearance:normalizeAppearance(meta.appearance),
    fontFamily: getAvailableNarrationFonts().includes(meta.fontFamily) ? meta.fontFamily : '',
    fontSize: Object.hasOwn(SAFE_SIZE_CLASSES, meta.fontSize) ? meta.fontSize : '',
    align: ['left','center','right'].includes(meta.align) ? meta.align : 'center'
  };
}
async function saveNarrationEntry(data, entryId = '') {
  if (!game.user?.isGM) throw new Error('Only the GM can save Narrate entries');
  const pack = getNarrationLibraryPack();
  if (!pack) return null;
  if (pack.locked) throw new Error('Unlock the ZFT Narrations compendium before saving.');
  const name = String(data.name ?? '').trim().slice(0, 140);
  const folderId = String(data.folderId ?? '');
  if (folderId && !pack.folders?.get(folderId)) throw new Error('The selected narration folder no longer exists.');
  if (!name) throw new Error('Give the saved narration a name');
  // World-scoped uploads are copied into the portable library on save.
  // If any copy fails, abort instead of saving a non-portable reference.
  const html = await rewriteLegacyImages(data.html, new Map());
  if (html !== sanitizeNarrationHtml(data.html)) data.portableHtml = html;
  if(data.appearance?.texture && !safeImagePath(data.appearance.texture))
    throw new Error('Background texture path is invalid. Select a Foundry image.');
  const originalAppearance=normalizeAppearance(data.appearance);
  const portableTexture=await migrateGraphicPath(originalAppearance.texture,new Map());
  data.appearance={...originalAppearance,texture:portableTexture};
  if (!html.trim()) throw new Error('Enter narration text first');
  const flags = { [ID]: { narrate: {
    schema: LIBRARY_SCHEMA, type: normalizeType(data.type),
    title: String(data.title ?? '').slice(0, 240),
    closeMode: data.closeMode === 'timed' ? 'timed' : 'manual',
    duration: normalizeDuration(data.duration) || DEFAULT_DURATION,
    postChat: data.postChat === true, scrollSpeed: narrationScrollSpeed(data.scrollSpeed),
    scrollMode: normalizeScrollMode(data.scrollMode),transition:normalizeTransition(data.transition),
    transitionDuration: normalizeTransitionDuration(data.transitionDuration),
    appearance:normalizeAppearance(data.appearance),
    fontFamily: getAvailableNarrationFonts().includes(data.fontFamily) ? data.fontFamily : '',
    fontSize: Object.hasOwn(SAFE_SIZE_CLASSES, data.fontSize) ? data.fontSize : '',
    align: ['left','center','right'].includes(data.align) ? data.align : 'center'
  }}};
  let entry = entryId ? await pack.getDocument(entryId) : null;
  if (entry && entry.flags?.[ID]?.narrate?.schema === LIBRARY_SCHEMA) {
    const page = entry.pages?.contents?.find(p => p.type === 'text');
    await entry.update({ name, flags, folder: folderId || null });
    if (page) await entry.updateEmbeddedDocuments('JournalEntryPage', [
      { _id: page.id, text: { content: html, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML } }
    ]);
    else await entry.createEmbeddedDocuments('JournalEntryPage', [
      { name: 'Narration', type: 'text', text: { content: html, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML } }
    ]);
  } else {
    entry = await JournalEntry.implementation.create({
      name, flags, folder: folderId || null,
      pages: [{ name: 'Narration', type: 'text', text: { content: html, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML } }]
    }, { pack: LIBRARY_PACK });
  }
  if (!entry?.id) throw new Error('Foundry did not confirm the compendium save');
  await noteManagedAssetsUsed(`${html}<img src="${data.appearance.texture}">`);
  return entry.id;
}
/** Shared compendium-folder browser for both loading and Save As.
 * All Narrations is a browsing view only; saving requires a concrete folder
 * or the explicit Unfiled location. Never overwrite an entry implicitly. */
async function openNarrationLibraryBrowser({mode = 'load', onLoad, onSave, onClose = () => {},
  defaultName = 'Untitled Narration', currentId = '', initialFolder = ''} = {}) {
  const saving = mode === 'save';
  const pack = getNarrationLibraryPack();
  if (!pack) {onClose();return;}
  if (saving && (pack.locked || !game.user?.isGM)) {
    ui.notifications?.warn('Unlock ZFT Narrations to save narration.');
    onClose();return;
  }
  try {
    const documents = await pack.getDocuments();
    const entries = documents.map(libraryEntryRecord).filter(Boolean);
    const initialEntry = saving ? entries.find(e => e.id === currentId) : null;
    let folderFilter = saving ? (initialEntry?.folderId || initialFolder || 'root') : '';
    let selectedId = initialEntry?.id || '';
    const content = `<section class="zft-narration-saved-picker ${saving?'zft-narration-save-picker':''}">
      <p>${saving?'Select a destination folder, name your passage, and save. Choose an existing passage only if you intend to overwrite it.':'Load a passage into the editor. Nothing is sent to players until you click Publish.'}</p>
      <label for="zft-narration-entry-search">Search all saved narration</label>
      <input id="zft-narration-entry-search" data-zft-entry-search type="search" placeholder="Search passages in any folder" autocomplete="off">
      <div class="zft-narration-library-sort"><label>Sort by
        <select data-zft-entry-sort><option value="name">Name A–Z</option><option value="reverse">Name Z–A</option>
        <option value="recent">Recently updated</option><option value="oldest">Oldest first</option>
        <option value="manual">Manual order</option></select></label>
      </div>
      <div class="zft-narration-library-browser">
        <aside class="zft-narration-library-folders" aria-label="Narration folders">
          <div class="zft-narration-browser-heading"><strong>Folders</strong>
            <button type="button" data-zft-folder-new title="Create a folder">+ New</button></div>
          <div data-zft-folder-tree></div>
          <button type="button" data-zft-folder-rename hidden>Rename selected folder</button>
        </aside>
        <div class="zft-narration-browser-passages">
          <div class="zft-narration-browser-heading"><strong data-zft-folder-heading>All Narrations</strong><span data-zft-passage-count></span>
            <button type="button" class="zft-narration-delete-selected" data-zft-delete-selected hidden disabled title="Delete checked saved passages">Delete Selected (0)</button></div>
          <div class="zft-narration-entry-list" data-zft-entry-list></div>
          <p class="zft-narration-entry-empty" data-zft-entry-empty hidden>No matching passages.</p>
        </div>
      </div>
      ${saving ? `<div class="zft-narration-save-footer">
        <label for="zft-narration-save-name">Save passage as</label>
        <input id="zft-narration-save-name" data-zft-save-name type="text" maxlength="140" autocomplete="off" value="${escapeHTML(defaultName)}">
        <small data-zft-save-location></small>
        <div class="zft-narration-save-controls"><span data-zft-save-hint>Enter a name for a new narration.</span>
          <button type="button" data-zft-confirm-save>Save Narration</button></div>
      </div>` : ''}
    </section>`;
    const popup = new Dialog({
      title: saving ? 'Narrate | Save to Library' : 'Narrate | Load Saved', content,
      buttons: { close: { label: 'Cancel' } }, default: 'close',
      close: () => onClose(),
      render: html => {
        const root = html instanceof HTMLElement ? html : html?.[0];
        if (!root) return;
        const search = root.querySelector('[data-zft-entry-search]');
        const sort = root.querySelector('[data-zft-entry-sort]');
        const tree = root.querySelector('[data-zft-folder-tree]');
        const list = root.querySelector('[data-zft-entry-list]');
        const heading = root.querySelector('[data-zft-folder-heading]');
        const rename = root.querySelector('[data-zft-folder-rename]');
        const nameInput = root.querySelector('[data-zft-save-name]');
        const saveButton = root.querySelector('[data-zft-confirm-save]');
        const hint = root.querySelector('[data-zft-save-hint]');
        const location = root.querySelector('[data-zft-save-location]');
        let folders = getNarrationFolders(pack);
        const deleteSelected=root.querySelector('[data-zft-delete-selected]');
        const selection=new Set();
        let busy = false;
        const canDelete=()=>game.user?.isGM && !pack.locked && !busy;
        function updateDeleteActions(){
          const enabled=game.user?.isGM && !pack.locked;
          deleteSelected.hidden=!enabled;
          deleteSelected.disabled=!canDelete()||!selection.size;
          deleteSelected.textContent=`Delete Selected (${selection.size})`;
        }
        async function deleteEntries(ids){
          if(!canDelete())return ui.notifications?.warn('Unlock ZFT Narrations to delete saved passages.');
          const targets=entries.filter(e=>ids.includes(e.id));
          if(!targets.length)return;
          const names=targets.slice(0,8).map(e=>`<li>${escapeHTML(e.name)}</li>`).join('');
          const extra=targets.length>8?`<p>...and ${targets.length-8} more.</p>`:'';
          const confirmed=await Dialog.confirm({title:`Delete ${targets.length} saved narration${targets.length===1?'':'s'}?`,
            content:`<p>Delete these saved passages permanently from the shared ZFT Narrations compendium?</p><ul>${names}</ul>${extra}<p>Illustration files are not deleted.</p>`,
            yes:()=>true,no:()=>false,defaultYes:false});
          if(!confirmed)return;
          busy=true;updateDeleteActions();
          let removed=0;
          try{
            for(const target of targets){
              const doc=await pack.getDocument(target.id);
              if(!doc || doc.flags?.[ID]?.narrate?.schema!==LIBRARY_SCHEMA)continue;
              await doc.delete();
              const idx=entries.findIndex(e=>e.id===target.id);
              if(idx>=0)entries.splice(idx,1);
              selection.delete(target.id);
              if(selectedId===target.id){selectedId='';if(saving)nameInput.value=defaultName;}
              removed++;
            }
            ui.notifications?.info(`Narrate: deleted ${removed} saved passage${removed===1?'':'s'}. Graphics were preserved.`);
          }catch(error){
            console.error(`${LOG} ❌ | Could not delete saved narration`,error);
            ui.notifications?.error(`Narrate: deletion stopped after ${removed} passage(s): ${error.message}`);
          }finally{busy=false;renderEntries();updateSaveInfo();updateDeleteActions();}
        }
        deleteSelected?.addEventListener('click',()=>void deleteEntries([...selection]));
        // Reconcile initial saved-entry selection against its current name.
        const nameAtSelection = () => entries.find(e=>e.id===selectedId)?.name ?? '';
        function renderTree() {
          folders = getNarrationFolders(pack);
          const rows = [{id:'',label:'All Narrations',depth:0},{id:'root',label:'Unfiled',depth:0},
            ...folders.map(f => ({...f,label:f.name,depth:f.depth}))];
          tree.innerHTML = rows.map(f => `<button type="button" class="${folderFilter === f.id?'is-selected':''}"
            style="padding-left:${8+f.depth*14}px" data-zft-folder-filter="${escapeHTML(f.id)}">
            <i class="fa-solid fa-${f.id === ''?'library':'folder'}"></i> ${escapeHTML(f.label)}</button>`).join('');
          tree.querySelectorAll('[data-zft-folder-filter]').forEach(button => button.addEventListener('click', () => {
            folderFilter = button.dataset.zftFolderFilter;
            if (saving) selectedId = ''; // choosing another destination means Save New unless an entry is reselected
            renderTree(); renderEntries(); updateSaveInfo();
          }));
          rename.hidden = !folderFilter || folderFilter === 'root' || pack.locked;
        }
        function renderEntries() {
          const query = search.value.trim().toLowerCase();
          // Searching is global, independently of the chosen destination folder.
          const matches = entries.filter(e => !query ? (folderFilter === '' || (folderFilter === 'root'
            ? !e.folderId : e.folderId === folderFilter)) : e.name.toLowerCase().includes(query));
          const order = sort.value;
          matches.sort((a,b) => order === 'reverse' ? b.name.localeCompare(a.name)
            : order === 'recent' ? b.modifiedAt - a.modifiedAt || a.name.localeCompare(b.name)
            : order === 'oldest' ? a.createdAt - b.createdAt || a.name.localeCompare(b.name)
            : order === 'manual' ? a.sort - b.sort || a.name.localeCompare(b.name)
            : a.name.localeCompare(b.name));
          const chosen = folders.find(f=>f.id === folderFilter);
          heading.textContent = query ? 'Search results' : chosen?.label ?? (folderFilter==='root'?'Unfiled':'All Narrations');
         root.querySelector('[data-zft-passage-count]').textContent = `${matches.length} passage${matches.length===1?'':'s'}`;
          list.innerHTML = matches.map(entry => `<div class="zft-narration-browser-entry ${selectedId === entry.id?'is-selected':''}">
            ${game.user?.isGM && !pack.locked ? `<input type="checkbox" class="zft-narration-entry-checkbox" data-zft-delete-check="${escapeHTML(entry.id)}" aria-label="Select ${escapeHTML(entry.name)} for deletion" ${selection.has(entry.id)?'checked':''}>`:''}
            <button type="button" class="zft-narration-entry-open" data-zft-${saving?'choose':'load'}-entry="${escapeHTML(entry.id)}" title="${saving?'Select to overwrite':'Load'} ${escapeHTML(entry.name)}">
              <i class="fa-solid fa-book-open"></i> <span>${escapeHTML(entry.name)}</span>
            </button>
            <button type="button" class="zft-narration-entry-move" data-zft-move-entry="${escapeHTML(entry.id)}" aria-label="Move ${escapeHTML(entry.name)} to another folder" title="Move to folder" ${pack.locked?'disabled':''}>
              <i class="fa-solid fa-folder-tree"></i></button>
            ${game.user?.isGM && !pack.locked ? `<button type="button" class="zft-narration-entry-delete" data-zft-delete-entry="${escapeHTML(entry.id)}" aria-label="Delete ${escapeHTML(entry.name)}" title="Delete saved narration"><i class="fa-solid fa-trash-can"></i></button>`:''}
            </div>`).join('');
         root.querySelector('[data-zft-entry-empty]').hidden = matches.length > 0;
          list.querySelectorAll('[data-zft-delete-check]').forEach(input=>input.addEventListener('change',()=>{
            if(input.checked)selection.add(input.dataset.zftDeleteCheck);else selection.delete(input.dataset.zftDeleteCheck);
            updateDeleteActions();
          }));
          list.querySelectorAll('[data-zft-delete-entry]').forEach(button=>button.addEventListener('click',()=>
            void deleteEntries([button.dataset.zftDeleteEntry])));
          updateDeleteActions();
          list.querySelectorAll('[data-zft-load-entry]').forEach(button => button.addEventListener('click', () => {
            const entry = entries.find(e=>e.id===button.dataset.zftLoadEntry);
            if (!entry) return;
            onLoad?.(entry); void popup.close();
          }));
          list.querySelectorAll('[data-zft-choose-entry]').forEach(button => button.addEventListener('click', () => {
            const entry = entries.find(e=>e.id===button.dataset.zftChooseEntry);
            if (!entry) return;
            selectedId = entry.id;
            folderFilter = entry.folderId || 'root';
            nameInput.value = entry.name;
            search.value = '';
            renderTree(); renderEntries(); updateSaveInfo();
          }));
          list.querySelectorAll('[data-zft-move-entry]').forEach(button => button.addEventListener('click', () => {
            const entry = entries.find(e=>e.id===button.dataset.zftMoveEntry);
            if (!entry || pack.locked) return;
            void askNarrationFolder(pack, {title:`Move ${entry.name}`,selected:entry.folderId ?? '',
              onChoose:async id => {
                const doc = await pack.getDocument(entry.id);
                if (!doc) throw new Error('Narration entry no longer exists.');
                await doc.update({folder:id||null}); entry.folderId=id||null;
                if (saving && selectedId===entry.id) folderFilter=id||'root';
                renderTree(); renderEntries(); updateSaveInfo();
              }});
          }));
        }
        function updateSaveInfo() {
          if (!saving) return;
          const destination = folders.find(f=>f.id===folderFilter);
          location.textContent = folderFilter === '' ? 'Choose a destination folder or Unfiled before saving'
            : `Location: ${destination?.label ?? 'Unfiled'}`;
          const selected = entries.find(e=>e.id===selectedId);
          hint.textContent = selected ? `Selected: overwrite “${selected.name}” (confirmation required)`
            : 'New narration. Select an existing passage to overwrite it.';
          saveButton.textContent = selected ? 'Update Narration' : 'Save New Narration';
          saveButton.disabled = busy || pack.locked || !nameInput.value.trim() || folderFilter === '';
        }
       root.querySelector('[data-zft-folder-new]')?.addEventListener('click', () => {
          if (pack.locked) return ui.notifications?.warn('Unlock ZFT Narrations to create folders.');
          void askNarrationFolderName(pack,{parentId:folderFilter && folderFilter!=='root' ? folderFilter : '',
            onSaved: id=>{ folderFilter=id||'root';selectedId='';search.value='';renderTree();renderEntries();updateSaveInfo(); }});
        });
        rename.addEventListener('click', () => {
          const current = folders.find(f=>f.id===folderFilter);
          if (current) void askNarrationFolderName(pack,{folderId:current.id,name:current.name,
            onSaved:()=>{renderTree();renderEntries();updateSaveInfo();}});
        });
        search.addEventListener('input', renderEntries);
        sort.addEventListener('change', renderEntries);
        if (saving) {
          nameInput.addEventListener('input', () => {
            if (selectedId && nameInput.value.trim() !== nameAtSelection()) selectedId = '';
            renderEntries(); updateSaveInfo();
          });
          // Prevent Foundry shortcuts or keyboard submission while naming drafts.
          nameInput.addEventListener('keydown', event=>event.stopPropagation());
          saveButton.addEventListener('click', async () => {
            if (busy || pack.locked || folderFilter === '') return;
            const name = nameInput.value.trim();
            if (!name) return ui.notifications?.warn('Give the narration a name.');
            const folderId = folderFilter==='root' ? '' : folderFilter;
            const overwrite = entries.find(e=>e.id===selectedId);
            const collision = entries.find(e=>e.folderId===(folderId||null) &&
              e.name.toLowerCase()===name.toLowerCase() && e.id!==selectedId);
            if (collision) {
              ui.notifications?.warn('A narration with this name already exists in this folder. Select it to overwrite, or choose another name.');
              return;
            }
            if (overwrite) {
              const confirmed = await Dialog.confirm({title:'Overwrite saved narration?',
                content:`<p>Replace “${escapeHTML(overwrite.name)}” in ZFT Narrations with the current editor content?</p>`,
                yes:()=>true,no:()=>false,defaultYes:false});
              if (!confirmed) return;
            }
            busy = true; updateSaveInfo();
            try {
              await onSave({name, folderId, entryId:overwrite?.id ?? ''});
              void popup.close();
            } catch (error) {
              console.error(`${LOG} ❌ | Save to narration compendium failed`,error);
              ui.notifications?.error(`Narrate: save failed (${error.message}).`);
            } finally { busy = false; updateSaveInfo(); }
          });
        }
        renderTree(); renderEntries(); updateSaveInfo();
        if (saving) nameInput.focus();
      }
    }, {width: 820, height: saving ? 650 : 540, resizable: true,
      classes: ['zft-cinematics-narration-popup','zft-cinematics-narration-browser-dialog']});
    popup.render(true);
  } catch (error) {
    onClose();
    console.error(`${LOG} ❌ | Unable to open narration library`,error);
    ui.notifications?.error(`Narrate: could not read library (${error.message}).`);
  }
}
async function openSavedNarrationPicker(onLoad) {
  return openNarrationLibraryBrowser({mode:'load',onLoad});
}
function askNarrationFolder(pack, {title,selected='',onChoose}) {
  const picker = new Dialog({title:`Narrate | ${title}`,
    content:`<section class="zft-narration-compact-form"><label>Destination folder</label>
      <select data-zft-folder-target>${narrationFolderOptions(pack,selected)}</select></section>`,
    buttons:{move:{label:'Move',callback: html => {
      const root=html instanceof HTMLElement ? html : html?.[0];
      const target=root?.querySelector('[data-zft-folder-target]')?.value??'';
      void Promise.resolve(onChoose(target)).catch(err=>ui.notifications?.error(`Narrate: ${err.message}`));
    }},cancel:{label:'Cancel'}},default:'cancel'
  },{width:440,classes:['zft-cinematics-narration-popup']});
  picker.render(true);
}
function askNarrationFolderName(pack,{parentId='',folderId='',name='',onSaved=()=>{}}={}) {
  const editing=Boolean(folderId);
  const picker=new Dialog({title:editing?'Narrate | Rename Folder':'Narrate | Create Folder',
    content:`<section class="zft-narration-compact-form"><label>Folder name</label>
      <input type="text" data-zft-folder-name maxlength="100" autocomplete="off" value="${escapeHTML(name)}">
      ${editing?'':`<label>Inside folder</label><select data-zft-folder-parent>${narrationFolderOptions(pack,parentId)}</select>`}</section>`,
    buttons:{save:{label:editing?'Rename Folder':'Create Folder',callback: html => {
      const root=html instanceof HTMLElement ? html : html?.[0];
      const name=root?.querySelector('[data-zft-folder-name]')?.value.trim();
      const parent=root?.querySelector('[data-zft-folder-parent]')?.value??'';
      if(!name){ui.notifications?.warn('Give the folder a name.');return false;}
      void (editing?renameNarrationFolder(pack,folderId,name):createNarrationFolder(pack,name,parent))
        .then(createdId=>onSaved(createdId)).catch(error=>ui.notifications?.error(`Narrate: ${error.message}`));
    }},cancel:{label:'Cancel'}},default:'cancel',
    render: html=>{const root=html instanceof HTMLElement?html:html?.[0];
      root?.querySelector('[data-zft-folder-name]')?.focus();}
  },{width:440,classes:['zft-cinematics-narration-popup']});
  picker.render(true);
}
/** Store and restore the editor selection around toolbar dropdown interactions. */
function configureNarrationEditor(root, prefs, persist) {
  const editor = root?.querySelector('[data-zft-narration-editor]');
  if (!editor) return;
  let savedRange = null;
  const saveRange = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && editor.contains(selection.anchorNode)) savedRange = selection.getRangeAt(0).cloneRange();
  };
  const restoreRange = () => {
    editor.focus();
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    if (savedRange && editor.contains(savedRange.commonAncestorContainer)) selection.addRange(savedRange);
    else {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.addRange(range);
    }
  };
  const runCommand = (command, value = null) => {
    if (['justifyLeft', 'justifyCenter', 'justifyRight'].includes(command)) {
      prefs.align = command.slice('justify'.length).toLowerCase();
      persist();
    }
    restoreRange();
    if (!document.execCommand(command, false, value)) {
      console.warn(`${LOG} ⚠️ | Narrate format command not supported`, { command });
      ui.notifications?.warn('Narrate: this formatting command is unavailable in your browser.');
    }
    saveRange();
  };
  const source = root.querySelector('[data-zft-narration-html-source]');
  const sourceButton = root.querySelector('[data-zft-narration-source-toggle]');
  const fileInput = root.querySelector('[data-zft-narration-upload-input]');
  let selectedImage = null;
  const pendingUploads = new Set();
  root.zftNarrationPendingUploads = pendingUploads;
  root.zftNarrationCommitSource = () => {
    if (!source || source.hidden) return;
    editor.innerHTML = sanitizeNarrationHtml(source.value);
    applyNarrationFonts(editor);
    source.hidden = true;
    editor.hidden = false;
    sourceButton?.classList.remove('is-active');
    sourceButton?.setAttribute('aria-pressed', 'false');
    selectedImage = null;
    syncImageControls();
  };
  sourceButton?.addEventListener('click', () => {
    if (!source) return;
    if (source.hidden) {
      source.value = sanitizeNarrationHtml(editor.innerHTML);
      source.hidden = false;
      editor.hidden = true;
      selectedImage = null;
      syncImageControls();
      sourceButton.classList.add('is-active');
      sourceButton.setAttribute('aria-pressed', 'true');
      source.focus();
    } else {
      root.zftNarrationCommitSource();
      editor.focus();
    }
  });
  function insertImageAtCaret(path, reference = null) {
    const safe = safeImagePath(path);
    if (!safe) throw new Error('The selected graphic has an unsafe image path');
    const img = document.createElement('img');
    img.src = safe;
    img.alt = 'Narration illustration';
    img.className = 'zft-narration-image zft-narration-image-75 zft-narration-image-center';
    img.loading = 'lazy';
    if (reference?.isConnected) reference.replaceWith(img);
    else { restoreRange(); document.execCommand('insertHTML', false, img.outerHTML); }
    selectedImage = img.isConnected ? img : null;
    syncImageControls();
    saveRange();
  }
  function insertUploadPlaceholder() {
    const marker = document.createElement('span');
    marker.textContent = '[Uploading graphic…]';
    marker.className = 'zft-narration-upload-placeholder';
    restoreRange();
    // DOM Range insertion is not reliant on HTML parsing of file-derived text.
    const selection = window.getSelection();
    if (selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      range.deleteContents(); range.insertNode(marker);
      range.setStartAfter(marker); range.collapse(true);
      selection.removeAllRanges(); selection.addRange(range);
    } else editor.append(marker);
    saveRange();
    return marker;
  }
  function queueGraphicUpload(file) {
    if (!file) return;
    if (!game.user?.isGM) { ui.notifications?.warn('Only the GM can upload Narrate graphics. Use File Picker for existing images.'); return; }
    if (!Object.hasOwn(IMAGE_TYPES, file.type) || file.size > ASSET_MAX_BYTES) {
      ui.notifications?.warn('Narrate accepts PNG, JPEG, WebP, or GIF graphics up to 8 MB.'); return;
    }
    if (!source.hidden) root.zftNarrationCommitSource();
    const placeholder = insertUploadPlaceholder();
    const task = uploadNarrationGraphic(file).then(path => {
      if (placeholder.isConnected) insertImageAtCaret(path, placeholder);
      else ui.notifications?.info('Graphic uploaded but the editor was closed. Find it in Graphics Library.');
    }).catch(error => {
      placeholder.remove();
      console.error(`${LOG} ❌ | Narration graphic upload failed`, error);
      ui.notifications?.error(`Narrate: graphic upload failed (${error.message}).`);
    }).finally(() => pendingUploads.delete(task));
    pendingUploads.add(task);
    const narrateButton = root.closest('.window-app')?.querySelector('.dialog-buttons button[data-button="narrate"]') ?? root.closest('.window-app')?.querySelector('.dialog-buttons button[data-action="narrate"]');
    if (narrateButton) narrateButton.disabled = true;
    void task.finally(() => { if (narrateButton) narrateButton.disabled = pendingUploads.size > 0; });
  }
  // Prioritize bitmap clipboard items. Pasted HTML is sanitized; markdown
  // from ordinary text is still converted by the existing parser.
  editor.addEventListener('paste', event => {
    const image = Array.from(event.clipboardData?.files ?? []).find(file => Object.hasOwn(IMAGE_TYPES, file.type));
    if (image) { event.preventDefault(); queueGraphicUpload(image); return; }
    event.preventDefault();
    const html = event.clipboardData?.getData('text/html') ?? '';
    if (html) {
      const cleaned = sanitizeNarrationHtml(html);
      if (cleaned) { runCommand('insertHTML', cleaned); return; }
    }
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (!text) return;
    const clipped = text.slice(0, MAX_NARRATION_TEXT);
    runCommand(hasNarrationMarkdown(clipped) ? 'insertHTML' : 'insertText',
      hasNarrationMarkdown(clipped) ? markdownToEditorHtml(clipped) : clipped);
  });
  editor.addEventListener('dragover', event => { if (event.dataTransfer?.types?.includes('Files')) event.preventDefault(); });
  editor.addEventListener('drop', event => {
    event.preventDefault();
    const file = Array.from(event.dataTransfer?.files ?? []).find(f => Object.hasOwn(IMAGE_TYPES, f.type));
    if (file) queueGraphicUpload(file);
  });
  root.querySelector('[data-zft-narration-upload]')?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', () => {
    for (const file of fileInput.files ?? []) queueGraphicUpload(file);
    fileInput.value = '';
  });
  root.querySelector('[data-zft-narration-picker]')?.addEventListener('click', () => {
    const Picker = foundry.applications.apps.FilePicker.implementation;
    const picker = new Picker({ type: 'image', callback: path => {
      try { if (!source.hidden) root.zftNarrationCommitSource(); insertImageAtCaret(path); }
      catch (err) { ui.notifications?.warn(`Narrate: ${err.message}`); }
    }});
    void picker.render({ force: true });
  });
  // Image-specific controls belong to the second toolbar and only activate
  // for a selected, attached editor image. Insert/Library remain available.
  const syncImageControls = () => {
    if (!selectedImage?.isConnected || !editor.contains(selectedImage)) selectedImage = null;
    root.querySelectorAll('[data-zft-narration-image-control]').forEach(el => {
      el.disabled = !selectedImage;
    });
    const widthSelect = root.querySelector('[data-zft-narration-image-width-select]');
    if (widthSelect) widthSelect.value = selectedImage
      ? ([25, 50, 75, 100].find(width => selectedImage.classList.contains(`zft-narration-image-${width}`)) ?? 75).toString()
      : '75';
    root.querySelectorAll('[data-zft-narration-image-align]').forEach(button => {
      button.classList.toggle('is-active', Boolean(selectedImage &&
        selectedImage.classList.contains(`zft-narration-image-${button.dataset.zftNarrationImageAlign}`)));
    });
  };
  editor.addEventListener('click', event => {
    selectedImage = event.target?.closest?.('img.zft-narration-image') ?? null;
    syncImageControls();
    saveRange();
  });
  root.querySelectorAll('[data-zft-narration-image-width-select]').forEach(button => button.addEventListener('change', () => {
    if (!selectedImage?.isConnected) return;
    const size = button.value;
    if (!IMAGE_WIDTHS.has(size)) return;
    selectedImage.classList.remove(...Array.from(selectedImage.classList).filter(c => /^zft-narration-image-(25|50|75|100)$/.test(c)));
    selectedImage.classList.add(`zft-narration-image-${size}`);
  }));
  root.querySelectorAll('[data-zft-narration-image-align]').forEach(button => button.addEventListener('click', () => {
    if (!selectedImage?.isConnected) return;
    const align = button.dataset.zftNarrationImageAlign;
    if (!IMAGE_ALIGNMENTS.has(align)) return;
    selectedImage.classList.remove(...Array.from(selectedImage.classList).filter(c => /^zft-narration-image-(left|center|right)$/.test(c)));
    selectedImage.classList.add(`zft-narration-image-${align}`);
    syncImageControls();
  }));
  root.querySelector('[data-zft-narration-image-remove]')?.addEventListener('click', () => {
    if (!selectedImage?.isConnected || !editor.contains(selectedImage)) return;
    selectedImage.remove();
    selectedImage = null;
    syncImageControls();
    editor.focus();
    saveRange();
  });
  root.querySelector('[data-zft-narration-manage]')?.addEventListener('mousedown', saveRange);
  root.querySelector('[data-zft-narration-manage]')?.addEventListener('click', () => {
    void openGraphicsManager({ onInsert: path => {
      if (!source.hidden) root.zftNarrationCommitSource();
      insertImageAtCaret(path);
    } });
  });
  // Foundry's dialog must not treat Enter as a submit shortcut. Normal Enter
  // makes a new paragraph; Shift+Enter creates an inline line break.
  editor.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    event.stopPropagation();
    // A real BR is required: Chromium's insertLineBreak can emit a text
    // newline which disappears under CSS white-space: normal in the overlay.
    if (event.shiftKey) {
      const selection = window.getSelection();
      if (selection?.rangeCount && editor.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const br = document.createElement('br');
        range.insertNode(br);
        // Browsers treat a final BR as a caret placeholder. A second trailing
        // BR ensures the next typed text stays after the requested line break.
        const trailing = document.createElement('br');
        br.after(trailing);
        range.setStartAfter(br); range.collapse(true);
        selection.removeAllRanges(); selection.addRange(range);
      }
    } else if (!document.execCommand('insertParagraph', false))
      document.execCommand('insertHTML', false, '<p><br></p>');
    saveRange();
  });
  // HTML source is a textarea: allow its native Enter newline, but keep
  // Foundry's dialog keyboard handler from submitting it.
  source?.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.isComposing) event.stopPropagation();
  });
  root.addEventListener('submit', event => { event.preventDefault(); event.stopPropagation(); });
  root.querySelector('[name="title"]')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); }
  });
  editor.addEventListener('keyup', saveRange);
  editor.addEventListener('mouseup', saveRange);
  editor.addEventListener('focus', saveRange);
  // Keep buttons from stealing the editor caret on mouse-down.
  root.querySelectorAll('[data-zft-format-command]').forEach(button => {
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => runCommand(button.dataset.zftFormatCommand));
  });
  for(const [selector,command] of [['[data-zft-selected-text-color]','foreColor'],
    ['[data-zft-selected-highlight-color]','hiliteColor']]){
    const picker=root.querySelector(selector);
    picker?.addEventListener('pointerdown',saveRange);
    picker?.addEventListener('focus',saveRange);
    picker?.addEventListener('change',()=>{
      const color=safeHex(picker.value,'');if(!color)return;
      // Native input[type=color] can steal the selection in Chromium/Foundry.
      // Restore the cloned editing range, then explicitly wrap selected content;
      // do not trust execCommand to report success if no visible style was made.
      restoreRange();
      const selection=window.getSelection();
      if(selection?.rangeCount){
        const range=selection.getRangeAt(0);
        if(!range.collapsed && editor.contains(range.commonAncestorContainer)){
          const span=document.createElement('span');
          if(command==='foreColor'){span.style.color=color;span.dataset.zftFg=color;}
          else {span.style.backgroundColor=color;span.dataset.zftBg=color;}
          span.append(range.extractContents());range.insertNode(span);
          const next=document.createRange();next.selectNodeContents(span);
          selection.removeAllRanges();selection.addRange(next);
          savedRange=next.cloneRange();
        } else {ui.notifications?.warn('Narrate: select text before choosing a color.');}
      }
      saveRange();
    });
  }
  const setTexture=path=>{
    const safe=safeImagePath(path);
    if(path && !safe){ui.notifications?.warn('Narrate: use a valid Foundry image path.');return;}
    const field=root.querySelector('[name="backgroundTexture"]');
    if(field)field.value=safe;
    applyAppearanceInputs(root,readAppearance(root));
    prefs.appearance=readAppearance(root);persist();
  };
  root.querySelector('[data-zft-texture-library]')?.addEventListener('click',()=>{
    void openNarrationBackgroundPicker(setTexture);
  });
  root.querySelector('[data-zft-texture-picker]')?.addEventListener('click',()=>{
    const Picker=foundry.applications.apps.FilePicker.implementation;
    void new Picker({type:'image',callback:setTexture}).render({force:true});
  });
  root.querySelector('[data-zft-texture-clear]')?.addEventListener('click',()=>setTexture(''));
  const textureUpload=root.querySelector('[data-zft-texture-upload-input]');
  root.querySelector('[data-zft-texture-upload]')?.addEventListener('click',()=>textureUpload?.click());
  textureUpload?.addEventListener('change',()=>{
    const file=textureUpload.files?.[0];textureUpload.value='';
    if(!file)return;
    const task=uploadNarrationGraphic(file).then(setTexture).catch(error=>{
      ui.notifications?.error(`Narrate: background upload failed (${error.message}).`);
    }).finally(()=>pendingUploads.delete(task));
    pendingUploads.add(task);
  });
  root.querySelector('[data-zft-appearance-save-default]')?.addEventListener('click',async event=>{
    const button=event.currentTarget;
    button.disabled=true;
    try {
      await saveAppearanceDefaults(readAppearance(root));
      ui.notifications?.info('Narrate: appearance saved as this world’s default for new narrations.');
    } catch(error) {ui.notifications?.error(`Narrate: could not save defaults (${error.message}).`);}
    finally {button.disabled=false;}
  });
  root.querySelector('[data-zft-appearance-restore-default]')?.addEventListener('click',()=>{
    applyAppearanceInputs(root,getAppearanceDefaults());
    prefs.appearance=readAppearance(root);persist();
    ui.notifications?.info('Narrate: applied saved appearance default to this draft.');
  });
  root.querySelector('[data-zft-appearance-reset]')?.addEventListener('click',()=>{
    applyAppearanceInputs(root,DEFAULT_APPEARANCE);
    prefs.appearance=readAppearance(root);persist();
    ui.notifications?.info('Narrate: original appearance applied to this draft.');
  });
  root.querySelectorAll('.zft-narration-appearance-settings input, .zft-narration-appearance-settings select')
    .forEach(el=>el.addEventListener('change',()=>{prefs.appearance=readAppearance(root);persist();}));
  const familySelect = root.querySelector('[name="fontFamily"]');
  // Read Foundry's currently loaded font families whenever Narrate opens.
  // GM-added world fonts become selectable without a Cinematics setting.
  if (familySelect) {
    for (const family of getAvailableNarrationFonts()) {
      const option = document.createElement('option');
      option.value = family;
      option.textContent = family;
      familySelect.append(option);
    }
    familySelect.addEventListener('change', event => {
      const family = event.target.value;
      if (getAvailableNarrationFonts().includes(family)) {
        prefs.fontFamily = family;
        // Apply the font only to the current selection; remember it for the next editor.
        runCommand('fontName', family);
        persist();
      }
    });
  }
  root.querySelector('[name="fontSize"]')?.addEventListener('change', event => {
    const size = event.target.value;
    if (Object.hasOwn(SAFE_SIZE_CLASSES, size)) {
      prefs.fontSize = size;
      runCommand('fontSize', size);
      persist();
    }
  });
  const type = root.querySelector('[name="type"]');
  const closeMode = root.querySelector('[name="closeMode"]');
  const titleField = root.querySelector('.zft-cinematics-narration-title-field');
  const durationField = root.querySelector('.zft-cinematics-narration-duration-field');
  const sync = () => {
    if (titleField) titleField.hidden = !['title', 'announcement'].includes(type?.value);
    if (durationField) durationField.hidden = closeMode?.value !== 'timed';
  };
  type.value = prefs.type;
  closeMode.value = prefs.closeMode;
  const durationInput = root.querySelector('[name="duration"]');
  if (durationInput) durationInput.value = String(prefs.duration);
  const scrollSpeedInput = root.querySelector('[name="scrollSpeed"]');
  applyScrollSpeedInputs(root,prefs.scrollSpeed);
  scrollSpeedInput?.addEventListener('change',()=>{
    root.querySelector('[data-zft-custom-speed]').hidden=scrollSpeedInput.value!=='custom';
    prefs.scrollSpeed=readScrollSpeed(root);persist();
  });
  root.querySelector('[name="customScrollSpeed"]')?.addEventListener('change',()=>{
    prefs.scrollSpeed=readScrollSpeed(root);persist();
  });
  const scrollModeInput=root.querySelector('[name="scrollMode"]');
  if(scrollModeInput)scrollModeInput.value=normalizeScrollMode(prefs.scrollMode);
  scrollModeInput?.addEventListener('change',()=>{prefs.scrollMode=normalizeScrollMode(scrollModeInput.value);persist();});
  const transitionInput=root.querySelector('[name="transition"]');
  if(transitionInput)transitionInput.value=normalizeTransition(prefs.transition);
  transitionInput?.addEventListener('change',()=>{prefs.transition=normalizeTransition(transitionInput.value);persist();});
  const transitionDurationInput=root.querySelector('[name="transitionDuration"]');
  if(transitionDurationInput)transitionDurationInput.value=String(normalizeTransitionDuration(prefs.transitionDuration));
  applyAppearanceInputs(root,prefs.appearance);
  transitionDurationInput?.addEventListener('change',()=>{prefs.transitionDuration=normalizeTransitionDuration(transitionDurationInput.value);persist();});
  const postChatInput = root.querySelector('[name="postChat"]');
  if (postChatInput) postChatInput.checked = prefs.postChat;
  postChatInput?.addEventListener('change', () => { prefs.postChat = postChatInput.checked; persist(); });
  if (familySelect && prefs.fontFamily && [...familySelect.options].some(option => option.value === prefs.fontFamily)) {
    familySelect.value = prefs.fontFamily;
    editor.style.fontFamily = JSON.stringify(prefs.fontFamily);
  }
  const fontSizeSelect = root.querySelector('[name="fontSize"]');
  if (fontSizeSelect && prefs.fontSize) fontSizeSelect.value = prefs.fontSize;
  if (prefs.fontSize) editor.classList.add(`zft-narration-size-${SAFE_SIZE_CLASSES[prefs.fontSize]}`);
  editor.style.textAlign = prefs.align;
  // Called only after an explicit GM selection from the shared compendium.
  root.zftNarrationApplyLibraryEntry = entry => {
    root.zftNarrationCommitSource?.();
    editor.innerHTML = sanitizeNarrationHtml(entry.html);
    applyNarrationFonts(editor);
    root.dataset.zftNarrationEntryId = entry.id;
    root.dataset.zftNarrationEntryName = entry.name;
    root.dataset.zftNarrationFolderId = entry.folderId || '';
    type.value = entry.type;
    closeMode.value = entry.closeMode;
    if (durationInput) durationInput.value = String(entry.duration);
    applyScrollSpeedInputs(root,entry.scrollSpeed);
    if(scrollModeInput)scrollModeInput.value=normalizeScrollMode(entry.scrollMode);
    if(transitionInput)transitionInput.value=normalizeTransition(entry.transition);
    if(transitionDurationInput)transitionDurationInput.value=String(normalizeTransitionDuration(entry.transitionDuration));
    applyAppearanceInputs(root,entry.appearance);
    const title = root.querySelector('[name="title"]');
    if (title) title.value = entry.title;
    if (postChatInput) postChatInput.checked = entry.postChat;
    prefs.type = entry.type; prefs.closeMode = entry.closeMode;
    prefs.duration = entry.duration; prefs.postChat = entry.postChat;
    prefs.scrollSpeed = narrationScrollSpeed(entry.scrollSpeed);
    prefs.scrollMode=normalizeScrollMode(entry.scrollMode);
    prefs.transition=normalizeTransition(entry.transition);
    prefs.transitionDuration=normalizeTransitionDuration(entry.transitionDuration);
    prefs.appearance=normalizeAppearance(entry.appearance);
    prefs.fontFamily = entry.fontFamily; prefs.fontSize = entry.fontSize;
    prefs.align = entry.align;
    editor.style.fontFamily = entry.fontFamily ? JSON.stringify(entry.fontFamily) : '';
    editor.style.textAlign = entry.align;
    editor.classList.remove(...Object.values(SAFE_SIZE_CLASSES).map(size => `zft-narration-size-${size}`));
    if (entry.fontSize) editor.classList.add(`zft-narration-size-${SAFE_SIZE_CLASSES[entry.fontSize]}`);
    if (familySelect) familySelect.value = entry.fontFamily;
    if (fontSizeSelect) fontSizeSelect.value = entry.fontSize;
    sync(); syncImageControls(); persist(); editor.focus();
    ui.notifications?.info(`Narrate: loaded ${entry.name}. Nothing has been broadcast.`);
  };
  type?.addEventListener('change', () => { prefs.type = type.value; sync(); persist(); });
  closeMode?.addEventListener('change', () => { prefs.closeMode = closeMode.value; sync(); persist(); });
  durationInput?.addEventListener('change', () => { prefs.duration = normalizeDuration(durationInput.value) || DEFAULT_DURATION; persist(); });
  sync();
  syncImageControls();
  editor.focus();
}
export function openNarrationDialog(initialValue = '', publishedEditDraft = null) {
  if (!canSubmit()) return;
  const prefs = getEditorPreferences();
  if(!publishedEditDraft && !initialValue) prefs.appearance=getAppearanceDefaults();
  let dialog;
  const liveOverlay=publishedEditDraft && game.user?.isGM ? document.getElementById(OVERLAY_ID) : null;
  const previousOverlayDisplay=liveOverlay?.style.display ?? '';
  if(liveOverlay)liveOverlay.style.display='none';
  const persist = () => { void saveEditorPreferences(prefs); };
  const captureEditor = root => {
    if (!root) return;
    const value = name => root.querySelector(`[name="${name}"]`)?.value ?? '';
    prefs.type = normalizeType(value('type'));
    prefs.closeMode = value('closeMode') === 'timed' ? 'timed' : 'manual';
    prefs.duration = normalizeDuration(value('duration')) || DEFAULT_DURATION;
    prefs.postChat = Boolean(root.querySelector('[name="postChat"]')?.checked);
    prefs.scrollSpeed = readScrollSpeed(root);
    prefs.scrollMode=normalizeScrollMode(value('scrollMode'));
    prefs.transition=normalizeTransition(value('transition'));
    prefs.transitionDuration=normalizeTransitionDuration(value('transitionDuration'));
    prefs.appearance=readAppearance(root);
  };
  const captureWindow = () => {
    if (!dialog) return;
    const pos = dialog.position ?? {};
    const el = dialog.element instanceof HTMLElement ? dialog.element : dialog.element?.[0];
    const rect = el?.getBoundingClientRect?.();
    const width = Number(pos.width ?? rect?.width), height = Number(pos.height ?? rect?.height);
    const left = Number(pos.left ?? rect?.left), top = Number(pos.top ?? rect?.top);
    if (Number.isFinite(width) && width >= 350) prefs.width = width;
    if (Number.isFinite(height) && height >= 365) prefs.height = height;
    if (Number.isFinite(left) && left >= 0) prefs.left = left;
    if (Number.isFinite(top) && top >= 0) prefs.top = top;
  };
  const content = `<form class="zft-cinematics-narration-dialog-form" onsubmit="return false">
    <header class="zft-narration-editor-heading">
      <i class="fa-solid fa-book-open"></i>
      <div class="zft-narration-heading-copy"><strong>Storytelling Editor</strong><small>Compose and style what your players will see.</small></div>
      <nav class="zft-narration-saved-actions" aria-label="Saved narration library">
        ${publishedEditDraft ? '<button type="button" data-zft-return-published title="Return to currently published narration without applying edits"><i class="fa-solid fa-arrow-rotate-left"></i> Return to Published</button>' : ''}
        <button type="button" data-zft-narration-load title="Load saved narration"><i class="fa-solid fa-folder-open" aria-hidden="true"></i> Load</button>
        <button type="button" data-zft-narration-save title="Save narration to the shared library"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Save</button>
        <button type="button" data-zft-library-lock title="Lock or unlock the shared narration compendium" hidden><i class="fa-solid fa-lock-open" aria-hidden="true"></i> Unlocked</button>
      </nav>
    </header>
    <div class="zft-narration-editor-options">
      <div class="zft-narration-field">
        <label for="zft-narration-type">Presentation</label>
        <select id="zft-narration-type" name="type">
          <option value="narration">Narration</option>
          <option value="title">Location Title</option>
          <option value="announcement">Announcement</option>
          <option value="subtitle">Subtitle</option>
        </select>
      </div>
      <div class="zft-narration-field">
        <label for="zft-narration-close-mode">Dismissal</label>
        <select id="zft-narration-close-mode" name="closeMode">
          <option value="manual">Manual (GM closes)</option>
          <option value="timed">Automatically after duration</option>
        </select>
      </div>
      <div class="zft-narration-field zft-cinematics-narration-duration-field" hidden>
        <label for="zft-narration-duration">Seconds (3–${MAX_DURATION})</label>
        <input id="zft-narration-duration" name="duration" type="number" min="3" max="${MAX_DURATION}" step="1" value="${DEFAULT_DURATION}">
      </div>
    </div>
    <div class="zft-narration-field zft-cinematics-narration-title-field" hidden>
      <label for="zft-narration-title">Title (optional)</label>
      <input id="zft-narration-title" name="title" type="text" maxlength="240" placeholder="A location or event title">
    </div>
    <div class="zft-narration-scroll-setting"><label for="zft-narration-scroll-speed">Auto-scroll when lengthy</label>
      <select id="zft-narration-scroll-speed" name="scrollSpeed" aria-label="Automatic scroll speed">
        <option value="very-slow">Very Slow · 8 px/s</option><option value="slow">Slow · 15 px/s</option>
        <option value="normal" selected>Normal · 25 px/s</option><option value="fast">Fast · 45 px/s</option>
        <option value="very-fast">Very Fast · 70 px/s</option><option value="custom">Custom…</option>
      </select>
      <label data-zft-custom-speed hidden>Custom <input name="customScrollSpeed" type="number" min="1" max="120" step="1" value="25" aria-label="Custom scrolling speed in pixels per second"> px/s</label>
      <label for="zft-narration-scroll-mode">Mode</label>
      <select id="zft-narration-scroll-mode" name="scrollMode" aria-label="Scrolling behavior">
        <option value="independent">Independent</option><option value="follow-gm">Follow GM (player override allowed)</option>
      </select>
      <small>Players can pause or take control. Follow GM can be rejoined manually.</small>
    </div>
    <div class="zft-narration-transition-setting">
      <label for="zft-narration-transition">Narration transition</label>
      <select id="zft-narration-transition" name="transition">
        <option value="none">None</option><option value="fade-in">Fade In</option>
        <option value="fade-both">Fade In / Out</option><option value="fade-black">Fade Through Black</option>
        <option value="dissolve">Dissolve</option>
      </select>
      <label for="zft-narration-transition-duration">Seconds</label>
      <input id="zft-narration-transition-duration" name="transitionDuration" type="number" min="0.25" max="5" step="0.25" value="1">
    </div>
    <label class="zft-narration-post-chat"><input type="checkbox" name="postChat"><span>Post narration to chat sidebar</span><small>Off: screen only for GM narration</small></label>
    <details class="zft-narration-appearance-settings">
      <summary><i class="fa-solid fa-palette"></i> Appearance · Font Colors, Highlights & Background</summary>
      <div class="zft-narration-appearance-grid">
        <label>Default text <input name="textColor" type="color" value="#f4efe4"></label>
        <label>Card background <input name="cardColor" type="color" value="#090a0d"></label>
        <label>Texture tint <input name="textureTint" type="color" value="#000000"></label>
        <label>Darkness <input name="textureDarkness" type="number" min="0" max="100" step="5" value="45">%</label>
        <label>Texture mode <select name="textureFit"><option value="tile">Tile</option><option value="cover">Cover</option><option value="contain">Contain</option></select></label>
        <label>Full-screen backdrop <input name="backdropColor" type="color" value="#000000"></label>
        <label>Backdrop opacity <input name="backdropOpacity" type="number" min="0" max="100" value="60">%</label>
      </div>
      <div class="zft-narration-texture-chooser">
        <label for="zft-narration-texture-path">Texture image</label>
        <input id="zft-narration-texture-path" name="backgroundTexture" type="text" placeholder="Select or upload a background…" aria-label="Narration background texture path">
        <div class="zft-narration-texture-actions" role="group" aria-label="Background texture actions">
          <button type="button" data-zft-texture-library><i class="fa-solid fa-images"></i> Select from Library</button>
          <button type="button" data-zft-texture-picker><i class="fa-solid fa-folder-open"></i> Browse Foundry</button>
          <button type="button" data-zft-texture-upload><i class="fa-solid fa-upload"></i> Upload</button>
          <button type="button" data-zft-texture-clear><i class="fa-solid fa-xmark"></i> Clear</button>
        </div>
        <input type="file" data-zft-texture-upload-input accept="image/png,image/jpeg,image/webp,image/gif" hidden>
        <small data-zft-texture-label>No texture selected</small>
      </div>
      <div class="zft-narration-appearance-default-actions" role="group" aria-label="Appearance defaults">
        <button type="button" data-zft-appearance-save-default><i class="fa-solid fa-floppy-disk"></i> Save as Default</button>
        <button type="button" data-zft-appearance-restore-default><i class="fa-solid fa-arrow-rotate-left"></i> Restore Default</button>
        <button type="button" data-zft-appearance-reset>Reset to Original</button>
      </div>
      <small>Defaults apply to new narrations in this world. Saved passages retain their own appearance. Background darkening never dims the text.</small>
    </details>
    <section class="zft-narration-compose" aria-label="Rich text narration editor">
      <div class="zft-narration-format-bar zft-narration-format-bar--text" role="toolbar" aria-label="Narration text formatting">
        <label class="zft-narration-format-select"><span>Font</span>
          <select name="fontFamily" aria-label="Font family">
            <option value="" selected>Select font</option>
          </select>
        </label>
        <label class="zft-narration-format-select zft-narration-format-size"><span>Size</span>
          <select name="fontSize" aria-label="Font size">
            <option value="" selected>Change size</option>
            <option value="1">Very small</option>
            <option value="2">Small</option>
            <option value="3">Normal</option>
            <option value="4">Large</option>
            <option value="5">Extra large</option>
            <option value="6">Huge</option>
          </select>
        </label>
        <span class="zft-narration-format-divider" aria-hidden="true"></span>
        <button type="button" data-zft-format-command="bold" title="Bold (Ctrl+B)" aria-label="Bold"><i class="fa-solid fa-bold"></i></button>
        <button type="button" data-zft-format-command="italic" title="Italic (Ctrl+I)" aria-label="Italic"><i class="fa-solid fa-italic"></i></button>
        <button type="button" data-zft-format-command="underline" title="Underline (Ctrl+U)" aria-label="Underline"><i class="fa-solid fa-underline"></i></button>
        <label class="zft-narration-inline-color" title="Color selected text">A <input type="color" data-zft-selected-text-color value="#e6bc65" aria-label="Selected text color"></label>
        <label class="zft-narration-inline-color" title="Highlight selected text"><i class="fa-solid fa-highlighter"></i> <input type="color" data-zft-selected-highlight-color value="#fff0a0" aria-label="Highlight color"></label>
        <span class="zft-narration-format-divider" aria-hidden="true"></span>
        <button type="button" data-zft-format-command="justifyLeft" title="Align left" aria-label="Align left"><i class="fa-solid fa-align-left"></i></button>
        <button type="button" data-zft-format-command="justifyCenter" title="Align center" aria-label="Align center"><i class="fa-solid fa-align-center"></i></button>
        <button type="button" data-zft-format-command="justifyRight" title="Align right" aria-label="Align right"><i class="fa-solid fa-align-right"></i></button>
        <span class="zft-narration-format-divider" aria-hidden="true"></span>
        <button type="button" data-zft-format-command="removeFormat" title="Clear selected formatting" aria-label="Clear selected formatting"><i class="fa-solid fa-eraser"></i></button>
        <span class="zft-narration-format-divider" aria-hidden="true"></span>
        <button type="button" data-zft-narration-source-toggle title="Edit HTML source" aria-label="HTML Source" aria-pressed="false"><i class="fa-solid fa-code"></i></button>
      </div>
      <div class="zft-narration-format-bar zft-narration-format-bar--images" role="toolbar" aria-label="Narration image tools">
        <span class="zft-narration-image-row-label"><i class="fa-solid fa-image" aria-hidden="true"></i> Images</span>
        <button type="button" class="zft-narration-image-action" data-zft-narration-upload title="Upload an image or paste Ctrl+V" aria-label="Upload Image"><i class="fa-solid fa-arrow-up-from-bracket" aria-hidden="true"></i><span>Upload</span></button>
        <button type="button" class="zft-narration-image-action" data-zft-narration-picker title="Choose an existing Foundry image" aria-label="Foundry Image Picker"><i class="fa-solid fa-folder-open" aria-hidden="true"></i><span>Browse</span></button>
        <button type="button" class="zft-narration-image-action zft-narration-manage-graphics" data-zft-narration-manage title="Browse and reuse previously uploaded narration images"><i class="fa-solid fa-images" aria-hidden="true"></i><span>Library</span></button>
        <input type="file" data-zft-narration-upload-input accept="image/png,image/jpeg,image/webp,image/gif" hidden>
        <span class="zft-narration-format-divider" aria-hidden="true"></span>
        <label class="zft-narration-format-select zft-narration-image-size-label"><span>Size</span><select data-zft-narration-image-control data-zft-narration-image-width-select disabled aria-label="Selected image width">
          <option value="25">25%</option><option value="50">50%</option><option value="75" selected>75%</option><option value="100">100%</option>
        </select></label>
        <span class="zft-narration-image-align-label">Align</span>
        <button type="button" data-zft-narration-image-control data-zft-narration-image-align="left" disabled title="Align selected image left" aria-label="Align image left"><i class="fa-solid fa-align-left"></i></button>
        <button type="button" data-zft-narration-image-control data-zft-narration-image-align="center" disabled title="Center selected image" aria-label="Center image"><i class="fa-solid fa-align-center"></i></button>
        <button type="button" data-zft-narration-image-control data-zft-narration-image-align="right" disabled title="Align selected image right" aria-label="Align image right"><i class="fa-solid fa-align-right"></i></button>
        <button type="button" class="zft-narration-image-remove" data-zft-narration-image-control data-zft-narration-image-remove disabled title="Remove the selected image from this narration (does not delete the uploaded file)" aria-label="Remove selected image"><i class="fa-solid fa-trash-can"></i></button>
      </div>
      <div class="zft-narration-editing-surface" data-zft-narration-editor contenteditable="true" spellcheck="true" role="textbox" aria-multiline="true" aria-label="Narration text" data-placeholder="Write your narration here...">${escapeHTML(initialValue).replace(/\r\n?|\n/g, '<br>')}</div>
      <textarea class="zft-narration-source-surface" data-zft-narration-html-source hidden spellcheck="false" aria-label="Safe HTML source"></textarea>
      <footer class="zft-narration-compose-footer"><span>HTML and graphics use safe Foundry-served assets only.</span><span>Markdown / HTML source</span></footer>
    </section>
    <!-- This is a regular type=button control, NOT a legacy Dialog submit button.
         Foundry V13 may close Dialog buttons after their callbacks, so keeping
         Preview outside submit is necessary to retain the editor DOM. -->
    <button type="button" class="zft-narration-preview-button" data-zft-narration-preview>
      <i class="fa-solid fa-eye" aria-hidden="true"></i> Preview (GM Only)
    </button>
  </form>`;
  dialog = new Dialog({
    title: 'Narrate | ZFT Cinematics', content,
    buttons: {
      publish: {
        icon: "<i class='fa-solid fa-bullhorn'></i>", label: 'Publish',
        callback: html => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          if (root?.zftNarrationPendingUploads?.size) {
            ui.notifications?.warn('Narrate: wait for graphics uploads to finish before publishing.');return false;
          }
          captureEditor(root);captureWindow();persist();
          const {draft,request} = getEditorDraftAndRequest(root,prefs);
          const clean=cleanRequest(request);
          if (!clean) {ui.notifications?.warn('Enter narration text or an illustration first.');return false;}
          const btn = dialog?.element?.find?.('[data-button="publish"]')?.[0];
          if (btn?.disabled) return false;
          if (btn) btn.disabled = true;
          void narrate(request).then(async success => {
            if (success === true) {
              if (game.user?.isGM) publishedDraft={stateId:getState()?.id,draft};
              await dialog.close();
            }
          }).catch(error => {
            console.error(`${LOG} ❌ | Narration publishing failed`, error);
            ui.notifications?.error(`Narrate: publishing failed (${error.message}).`);
          }).finally(()=>{if(btn)btn.disabled=false;});
          return false;
        }
      },
      cancel: { icon: "<i class='fa-solid fa-xmark'></i>", label: 'Cancel' }
    },
    // Only explicit Publish sends to players; Preview and Enter never broadcast.
    render: html => {
      const root = html instanceof HTMLElement ? html : html?.[0];
      configureNarrationEditor(root, prefs, persist);
      if(publishedEditDraft && root?.zftNarrationApplyLibraryEntry){
        root.zftNarrationApplyLibraryEntry({...publishedEditDraft,id:publishedEditDraft.entryId ?? '',
          name:publishedEditDraft.name??'Published Narration'});
      }
      root?.querySelector('[data-zft-return-published]')?.addEventListener('click',()=>{void dialog.close();});
      // A native legacy Dialog button can submit/close the window, triggering
      // the close hook which removes our preview immediately. Preview must
      // therefore use its own click listener, not a Dialog.buttons callback.
      const previewButton = root?.querySelector('[data-zft-narration-preview]');
      if (previewButton) {
        previewButton.hidden = !game.user?.isGM;
        // Use the usual Dialog footer position while retaining a fallback
        // directly beneath the compose area if a theme replaces the footer.
        const el = dialog?.element instanceof HTMLElement ? dialog.element : dialog?.element?.[0];
        const footer = el?.querySelector('.dialog-buttons') ?? root?.querySelector('.dialog-buttons');
        footer?.prepend(previewButton);
        previewButton.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          if (!game.user?.isGM) return;
          if (root?.zftNarrationPendingUploads?.size) {
            ui.notifications?.warn('Narrate: wait for graphics uploads to finish before previewing.');return;
          }
          try {
            captureEditor(root);captureWindow();persist();
            const {draft,request} = getEditorDraftAndRequest(root,prefs);
            if (!showPreview(dialog,root,request,draft))
              console.warn(`${LOG} ⚠️ | Preview did not start; editor remains open.`);
          } catch (error) {
            console.error(`${LOG} ❌ | Preview failed`,error);
            ui.notifications?.error(`Narrate: preview failed (${error.message}).`);
          }
        });
      }
      const lockButton = root?.querySelector('[data-zft-library-lock]');
      const refreshLock = () => {
        const pack = getNarrationLibraryPack({notify:false});
        if (!lockButton) return;
        lockButton.hidden = !game.user?.isGM || !pack;
        if (!pack) return;
        lockButton.innerHTML = pack.locked ? '<i class="fa-solid fa-lock"></i> Locked'
          : '<i class="fa-solid fa-lock-open"></i> Unlocked';
        lockButton.setAttribute('aria-pressed',String(!pack.locked));
        lockButton.title = pack.locked ? 'Unlock ZFT Narrations to save and upload'
          : 'Lock ZFT Narrations (loading stays available)';
      };
      refreshLock();
      lockButton?.addEventListener('click', async () => {
        const pack=getNarrationLibraryPack();
        if (!game.user?.isGM || !pack) return;
        lockButton.disabled=true;
        try { await pack.configure({locked:!pack.locked});refreshLock(); }
        catch(error) {ui.notifications?.error(`Narrate: cannot change library lock (${error.message}).`);}
        finally {lockButton.disabled=false;}
      });
      root?.querySelector('[data-zft-narration-load]')?.addEventListener('click', () => {
        void openSavedNarrationPicker(entry => root?.zftNarrationApplyLibraryEntry?.(entry));
      });
      root?.querySelector('[data-zft-narration-save]')?.addEventListener('click', () => {
        if (root.zftNarrationPendingUploads?.size) {
          ui.notifications?.warn('Narrate: wait for image uploads to finish before saving.'); return;
        }
        root.zftNarrationCommitSource?.();
        captureEditor(root);
        const editor = root.querySelector('[data-zft-narration-editor]');
        const existing = root.dataset.zftNarrationEntryId ?? '';
        const defaultName = root.dataset.zftNarrationEntryName || root.querySelector('[name="title"]')?.value || 'Untitled Narration';
        const pack=getNarrationLibraryPack();
        if(!pack) return;
        void openNarrationLibraryBrowser({mode:'save',defaultName,currentId:existing,
          initialFolder:root.dataset.zftNarrationFolderId ?? '',
          onSave: async ({name,folderId,entryId}) => {
            // Obtain the composition at click time, not when Save As first opened.
            if (root.zftNarrationPendingUploads?.size) throw new Error('Wait for graphics uploads before saving.');
            root.zftNarrationCommitSource?.();
            captureEditor(root);
            const html = editor?.innerHTML || '';
            const data = {
              name, folderId, html, type:root.querySelector('[name="type"]')?.value,
              title:root.querySelector('[name="title"]')?.value,
              closeMode:root.querySelector('[name="closeMode"]')?.value,
              scrollSpeed:readScrollSpeed(root),scrollMode:root.querySelector('[name="scrollMode"]')?.value,
              transition:root.querySelector('[name="transition"]')?.value,
              transitionDuration:root.querySelector('[name="transitionDuration"]')?.value,
              duration:root.querySelector('[name="duration"]')?.value,
              postChat:root.querySelector('[name="postChat"]')?.checked === true,
              appearance:readAppearance(root),
              fontFamily:prefs.fontFamily,fontSize:prefs.fontSize,align:prefs.align
            };
            const id = await saveNarrationEntry(data,entryId);
            // Retain portable references after migrating older world graphics.
            if (data.portableHtml && editor && editor.innerHTML === data.html) {
              editor.innerHTML = data.portableHtml; applyNarrationFonts(editor);
            }
            applyAppearanceInputs(root,data.appearance);
            root.dataset.zftNarrationEntryId = id;
            root.dataset.zftNarrationEntryName = name;
            root.dataset.zftNarrationFolderId = folderId;
            ui.notifications?.info(`Narrate: saved ${name} to ZFT Narrations.`);
          }
        });
      });
    },
    close: html => {
      if (previewSession?.dialog === dialog) closePreview({returnToEditor:false});
      if(liveOverlay?.isConnected)liveOverlay.style.display=previousOverlayDisplay;
      const root = html instanceof HTMLElement ? html : html?.[0];
      captureEditor(root);
      captureWindow();
      persist();
    }
  }, {
    width: Math.min(prefs.width, Math.max(350, window.innerWidth - 60)),
    height: Math.min(prefs.height, Math.max(365, window.innerHeight - 80)),
    ...(prefs.left !== null && prefs.top !== null
      ? { left: Math.min(prefs.left, window.innerWidth - 200), top: Math.min(prefs.top, window.innerHeight - 100) }
      : {}),
    resizable: true,
    classes: ['zft-cinematics-narration-dialog']
  });
  dialog.render(true);
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
  applyNarrationFonts(element);
}
export function registerNarrationSettings() {
  game.settings.register(ID, EDITOR_PREFS_KEY, {
    name: 'Narrate Editor Preferences', scope: 'client', config: false, type: Object,
    default: { ...EDITOR_DEFAULTS }
  });
  game.settings.register(ID, APPEARANCE_DEFAULTS_KEY, {
    name:'Narrate Default Appearance',scope:'world',config:false,type:Object,
    default:{...DEFAULT_APPEARANCE}
  });
  game.settings.register(ID, LIBRARY_INITIALIZED_KEY, {
    name:'Narrate Library First Initialization',scope:'world',config:false,type:Boolean,default:false
  });
  game.settings.register(ID, ASSETS_KEY, {
    name: 'Narrate Managed Graphics', scope: 'world', config: false, type: Array, default: []
  });
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
  if(!narrationSocketRegistered && game.socket?.on){
    game.socket.on(SCROLL_SOCKET,receiveNarrationScroll);
    narrationSocketRegistered=true;
  }
  buildOverlay();
  renderState();
  if (game.user?.isGM) {
    void initializeNarrationLibraryLock().catch(error =>
      console.warn(`${LOG} ⚠️ | Could not initialize library lock`, error));
    console.info(`${LOG} 🧹 | Library cleanup is manual and reference-aware; no files are auto-deleted.`);
  }
  Hooks.on('chatMessage', handleChatCommand);
  Hooks.on('createChatMessage', message => {
    void handlePlayerNarration(message).catch(error => {
      console.error(`${LOG} ❌ | Player narration synchronization failed`, error);
    });
  });
  Hooks.on('renderChatMessageHTML', decorateChatMessage);
  console.info(`${LOG} ✅ | Ready. Narration library ${getNarrationLibraryPack({notify:false}) ? 'available' : 'not active'}. ZFT Tools Narrate, /narrate, /narration, /narrate-close`);
}
export function contributeNarrationTool(tools) {
  if (!game.user?.isGM) return;
  tools['zft-cinematics-narrate'] = {
    name: 'zft-cinematics-narrate', title: 'Narrate',
    icon: 'fa-solid fa-book-open', order: 35, button: true, visible: true,
    onChange: () => openNarrationDialog()
  };
}
export const narrationApi = Object.freeze({
  openDialog: openNarrationDialog, narrate, close: closeNarration
});
