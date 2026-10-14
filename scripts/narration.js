/**
 * ZFT Cinematics Narration - Phase 1 presentation + rich editor (V13 target).
 * The world setting remains authoritative; legacy message-only states and
 * narrate(text) calls are accepted without migration.
 */
const ID = 'zft-cinematics';
const VERSION = '0.2.0-dev.10';
const LOG = `[ZFT] 🎙️ v${VERSION} | Cinematics Narration`;
const STATE_KEY = 'narrationState';
const MINIMUM_ROLE_KEY = 'narrationMinimumRole';
const SPEAKER_ALIAS_KEY = 'narrationSpeakerAlias';
const EDITOR_PREFS_KEY = 'narrationEditorPreferences';
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
const CHAT_FLAG = 'narration';
const TYPES = Object.freeze(['narration', 'title', 'announcement', 'subtitle']);
const DEFAULT_DURATION = 12;
const MAX_DURATION = 300;
const MAX_NARRATION_TEXT = 20000;
const MAX_RICH_HTML = 60000;
const EDITOR_DEFAULTS = Object.freeze({
  type: 'narration', closeMode: 'manual', duration: DEFAULT_DURATION,
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
    (textIncludesPath(state.message, path) || textIncludesPath(state.messageHtml, path))) return true;
  // Protect a passage currently being composed in this browser even if it
  // has not yet been saved to the compendium.
  return Array.from(document.querySelectorAll('[data-zft-narration-editor] img[src]'))
    .some(img => img.getAttribute('src') === path);
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
/** Manually invoked migration also rewrites existing saved entries; unsaved
 * drafts are not rewritten, and originals are left untouched. */
async function migrateLegacyNarrationLibrary() {
  const pack = getNarrationLibraryPack();
  if (!pack || pack.locked) throw new Error('Unlock ZFT Narrations before migrating graphics.');
  const mapping = new Map();
  const failed = [];
  const docs = await pack.getDocuments();
  let updatedEntries = 0;
  for (const doc of docs) {
    if (doc.flags?.[ID]?.narrate?.schema !== LIBRARY_SCHEMA) continue;
    for (const page of doc.pages?.contents ?? []) {
      if (page.type !== 'text') continue;
      const original = page.text?.content ?? '';
      if (!extractImagePaths(original).some(isLegacyGraphic)) continue;
      try {
        const next = await rewriteLegacyImages(original, mapping);
        if (next !== original) {
          await doc.updateEmbeddedDocuments('JournalEntryPage', [{_id:page.id, text:{content:next, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML}}]);
          updatedEntries++;
        }
      } catch (error) { failed.push(`${doc.name}: ${error.message}`); }
    }
  }
  for (const item of getManagedAssets()) {
    if (!isLegacyGraphic(item.path)) continue;
    try {
      const newPath = await migrateGraphicPath(item.path, mapping);
      if (item.keep && isLibraryGraphic(newPath)) {
        await updateLibraryRecords(items => items.map(a => a.path === newPath ? {...a,keep:true} : a));
      }
    } catch (error) { failed.push(`${item.path}: ${error.message}`); }
  }
  return {copied: mapping.size, updatedEntries, failed};
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
          ${status==='Review after 7 days' && !issue ? `<label><input type="checkbox" data-zft-cleanup-select="${i}"> Review</label>` : ''}
        </div>
      </div>
    </article>`;
  }).join('');
  const issues = missing.length ? `<details class="zft-narration-missing-report"><summary>Missing images in saved narration (${missing.length})</summary><ul>${missing.map(([path,names])=>`<li>${escapeHTML(path)}: ${escapeHTML([...names].join(', '))}</li>`).join('')}</ul></details>` : '';
  const content = `<div class="zft-narration-graphics-library">
    <p class="zft-narration-library-intro">${records.length} graphics · ${(total/(1024*1024)).toFixed(2)} MB tracked · ${eligible.length} cleanup candidates · ${missing.length} missing shared image${missing.length===1?'':'s'}.</p>
    <p class="zft-narration-library-intro">${pack.locked?'Unlock ZFT Narrations to upload, change Keep, or migrate.':'Saved passages protect referenced graphics automatically.'}</p>
    <label class="zft-narration-library-search-label" for="zft-narration-graphics-search">Find graphic</label>
    <input id="zft-narration-graphics-search" type="search" data-zft-graphics-search placeholder="Search by filename…" autocomplete="off">
    <div class="zft-narration-asset-gallery" data-zft-asset-gallery>${cards||'<p>No graphics in the library. Upload one in Narrate.</p>'}</div>
    <p class="zft-narration-asset-empty" data-zft-asset-no-results hidden>No matching graphics.</p>
    ${issues}
    <div class="zft-narration-maintenance-actions">
      <button type="button" data-zft-migrate-legacy ${pack.locked?'disabled':''}>Migrate Legacy Graphics</button>
      <button type="button" data-zft-cleanup-list>Review Selected Cleanup</button>
    </div>
    <p class="zft-narration-library-notice">Saved references, Keep, and live content protect graphics. Unreferenced graphics become eligible after seven days. Cleanup creates a manual file list only; <strong>no files are deleted automatically</strong>. Migration never deletes originals.</p>
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
      root.querySelector('[data-zft-migrate-legacy]')?.addEventListener('click', async ()=>{
        const okay=await Dialog.confirm({title:'Migrate legacy graphics?',content:'<p>Copy previously uploaded Narrate graphics into the portable library and update saved compendium references. Original files are preserved. Continue?</p>',yes:()=>true,no:()=>false,defaultYes:false});
        if(!okay)return;
        try {
          const report=await migrateLegacyNarrationLibrary();
          ui.notifications?.info(`Narrate: copied ${report.copied} graphic(s), updated ${report.updatedEntries} saved page(s). ${report.failed.length} error(s). Reopen Graphics Library to refresh.`);
          if(report.failed.length)console.warn(`${LOG} ⚠️ | Legacy migration issues`,report.failed);
        } catch(error){ui.notifications?.error(`Narrate: migration failed (${error.message}).`);}
      });
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
    } else if (tag === 'SPAN' || tag === 'FONT') {
      const font = safeFont(node);
      const classes = [font.legacy, safeSize(node)].filter(Boolean);
      // Strip arbitrary CSS and attributes. Retain only registered font names.
      if (classes.length || font.family) {
        target = document.createElement('span');
        if (classes.length) target.className = classes.join(' ');
        if (font.family) target.dataset.zftNarrationFont = font.family;
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
    postChat: src.postChat === undefined ? true : src.postChat === true
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
    postChat: normalized.postChat
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
  // Values originate from escaped plain-text API inputs. Existing state uses
  // escaped <br> text from the previous narration implementation.
  title.innerHTML = active ? sanitizeNarrationHtml(String(state.title ?? '')) : '';
  content.innerHTML = active ? sanitizeNarrationHtml(String(state.message ?? '')) : '';
  if (active) applyNarrationFonts(content);
  title.hidden = !active || !state?.title;
  content.hidden = !active || !state?.message;
  overlay.dataset.presentation = type;
  overlay.classList.toggle('gm-control', Boolean(game.user?.isGM));
  overlay.classList.toggle('active', active);
  scheduleExpiry(state);
  if (active) {
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
    paused: true
  };
}
/** This operation must run on a GM client because state is world-scoped. */
async function createNarrationAsGM(request) {
  if (!game.user?.isGM) return false;
  const next = makeState(request, getState());
  if (!await setNarrationState(next)) return false;
  await noteManagedAssetsUsed(request.message).catch(error =>
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
    await noteManagedAssetsUsed(request.message).catch(error =>
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
    expiresAt: 0, paused: true
  });
  if (closed) console.info(`${LOG} ✅ | Narration closed for everyone`, { id: current?.id });
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
    postChat: meta.postChat === true,
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
  if (!html.trim()) throw new Error('Enter narration text first');
  const flags = { [ID]: { narrate: {
    schema: LIBRARY_SCHEMA, type: normalizeType(data.type),
    title: String(data.title ?? '').slice(0, 240),
    closeMode: data.closeMode === 'timed' ? 'timed' : 'manual',
    duration: normalizeDuration(data.duration) || DEFAULT_DURATION,
    postChat: data.postChat === true,
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
  await noteManagedAssetsUsed(html);
  return entry.id;
}
async function openSavedNarrationPicker(onLoad) {
  const pack = getNarrationLibraryPack();
  if (!pack) return;
  try {
    const documents = await pack.getDocuments();
    let entries = documents.map(libraryEntryRecord).filter(Boolean);
    const content = `<section class="zft-narration-saved-picker">
      <p>Load a passage into the editor. Nothing is sent to players until you click Narrate.</p>
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
            <button type="button" data-zft-folder-new title="Create folder">+ New</button>
          </div>
          <div data-zft-folder-tree></div>
          <button type="button" data-zft-folder-rename hidden>Rename selected folder</button>
        </aside>
        <div class="zft-narration-browser-passages">
          <div class="zft-narration-browser-heading"><strong data-zft-folder-heading>All Narrations</strong><span data-zft-passage-count></span></div>
          <div class="zft-narration-entry-list" data-zft-entry-list></div>
          <p class="zft-narration-entry-empty" data-zft-entry-empty hidden>No matching passages.</p>
        </div>
      </div>
    </section>`;
    let folderFilter = ''; // '' all; root null represented by 'root'
    const popup = new Dialog({
      title: 'Narrate | Load Saved', content,
      buttons: { close: { label: 'Cancel' } }, default: 'close',
      render: html => {
        const root = html instanceof HTMLElement ? html : html?.[0];
        if (!root) return;
        const search = root.querySelector('[data-zft-entry-search]');
        const sort = root.querySelector('[data-zft-entry-sort]');
        const tree = root.querySelector('[data-zft-folder-tree]');
        const list = root.querySelector('[data-zft-entry-list]');
        const heading = root.querySelector('[data-zft-folder-heading]');
        const rename = root.querySelector('[data-zft-folder-rename]');
        let folders = getNarrationFolders(pack);
        function renderTree() {
          folders = getNarrationFolders(pack);
          const rows = [{id:'',label:'All Narrations',depth:0},{id:'root',label:'Unfiled',depth:0},
            ...folders.map(f => ({...f,label:f.name,depth:f.depth}))];
          tree.innerHTML = rows.map(f => `<button type="button" class="${folderFilter === f.id?'is-selected':''}"
            style="padding-left:${8+f.depth*14}px" data-zft-folder-filter="${escapeHTML(f.id)}">
            <i class="fa-solid fa-${f.id === ''?'library':'folder'}"></i> ${escapeHTML(f.label)}</button>`).join('');
          tree.querySelectorAll('[data-zft-folder-filter]').forEach(button => button.addEventListener('click', () => {
            folderFilter = button.dataset.zftFolderFilter; renderTree(); renderEntries();
          }));
          rename.hidden = !folderFilter || folderFilter === 'root' || pack.locked;
        }
        function renderEntries() {
          const query = search.value.trim().toLowerCase();
          // A search is global, deliberately ignoring the current folder filter.
          const matches = entries.filter(e => (!query ? (folderFilter === '' || (folderFilter === 'root'
            ? !e.folderId : e.folderId === folderFilter)) : e.name.toLowerCase().includes(query)));
          const order = sort.value;
          matches.sort((a,b) => order === 'reverse' ? b.name.localeCompare(a.name)
            : order === 'recent' ? b.modifiedAt - a.modifiedAt || a.name.localeCompare(b.name)
            : order === 'oldest' ? a.createdAt - b.createdAt || a.name.localeCompare(b.name)
            : order === 'manual' ? a.sort - b.sort || a.name.localeCompare(b.name)
            : a.name.localeCompare(b.name));
          const chosen = folders.find(f=>f.id === folderFilter);
          heading.textContent = query ? 'Search results' : chosen?.label ?? (folderFilter==='root'?'Unfiled':'All Narrations');
          root.querySelector('[data-zft-passage-count]').textContent = `${matches.length} passages`;
          list.innerHTML = matches.map(entry => `<div class="zft-narration-browser-entry">
            <button type="button" data-zft-load-entry="${escapeHTML(entry.id)}" title="Load this narration">
              <i class="fa-solid fa-book-open"></i> <span>${escapeHTML(entry.name)}</span>
            </button>
            <button type="button" data-zft-move-entry="${escapeHTML(entry.id)}" title="Move to folder" ${pack.locked?'disabled':''}>
              <i class="fa-solid fa-folder-tree"></i> Move</button></div>`).join('');
          root.querySelector('[data-zft-entry-empty]').hidden = matches.length > 0;
          list.querySelectorAll('[data-zft-load-entry]').forEach(button => button.addEventListener('click', () => {
            const entry = entries.find(e => e.id === button.dataset.zftLoadEntry);
            if (entry) onLoad(entry);
            void popup.close();
          }));
          list.querySelectorAll('[data-zft-move-entry]').forEach(button => button.addEventListener('click', () => {
            const entry = entries.find(e => e.id === button.dataset.zftMoveEntry);
            if (!entry) return;
            void askNarrationFolder(pack, {title:`Move ${entry.name}`, selected:entry.folderId ?? '',
              onChoose:async id => {
                const doc = await pack.getDocument(entry.id);
                if (!doc) throw new Error('Narration entry no longer exists.');
                await doc.update({folder:id||null}); entry.folderId=id||null;
                renderTree();renderEntries();
              }});
          }));
        }
        root.querySelector('[data-zft-folder-new]')?.addEventListener('click', () => {
          if (pack.locked) return ui.notifications?.warn('Unlock ZFT Narrations to create folders.');
          void askNarrationFolderName(pack,{parentId:folderFilter && folderFilter!=='root' ? folderFilter : '',
            onSaved: () => {renderTree();renderEntries();}});
        });
        rename.addEventListener('click', () => {
          const current = folders.find(f=>f.id===folderFilter);
          if (current) void askNarrationFolderName(pack,{folderId:current.id,name:current.name,
            onSaved:()=>{renderTree();renderEntries();}});
        });
        search.addEventListener('input',renderEntries);
        sort.addEventListener('change',renderEntries);
        renderTree();renderEntries();
      }
    }, { width: 800, height: 540, resizable: true, classes: ['zft-cinematics-narration-popup','zft-cinematics-narration-browser-dialog'] });
    popup.render(true);
  } catch (error) {
    console.error(`${LOG} ❌ | Unable to load saved narration`, error);
    ui.notifications?.error(`Narrate: could not read library (${error.message}).`);
  }
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
    const title = root.querySelector('[name="title"]');
    if (title) title.value = entry.title;
    if (postChatInput) postChatInput.checked = entry.postChat;
    prefs.type = entry.type; prefs.closeMode = entry.closeMode;
    prefs.duration = entry.duration; prefs.postChat = entry.postChat;
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
export function openNarrationDialog(initialValue = '') {
  if (!canSubmit()) return;
  const prefs = getEditorPreferences();
  let dialog;
  const persist = () => { void saveEditorPreferences(prefs); };
  const captureEditor = root => {
    if (!root) return;
    const value = name => root.querySelector(`[name="${name}"]`)?.value ?? '';
    prefs.type = normalizeType(value('type'));
    prefs.closeMode = value('closeMode') === 'timed' ? 'timed' : 'manual';
    prefs.duration = normalizeDuration(value('duration')) || DEFAULT_DURATION;
    prefs.postChat = Boolean(root.querySelector('[name="postChat"]')?.checked);
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
      <div><strong>Storytelling Editor</strong><small>Compose and style what your players will see.</small></div>
    </header>
    <nav class="zft-narration-saved-actions" aria-label="Saved narration library">
      <span><i class="fa-solid fa-book-bookmark"></i> Saved Narration</span>
      <button type="button" data-zft-narration-load title="Load a passage from the shared narration compendium"><i class="fa-solid fa-folder-open"></i> Load</button>
      <button type="button" data-zft-narration-save title="Save this passage to the shared narration compendium"><i class="fa-solid fa-floppy-disk"></i> Save</button>
      <button type="button" data-zft-library-lock title="Lock or unlock the shared Narration compendium" hidden><i class="fa-solid fa-lock-open"></i> Unlocked</button>
      <small>Shared across worlds using this Foundry Data directory</small>
    </nav>
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
    <label class="zft-narration-post-chat"><input type="checkbox" name="postChat"><span>Post narration to chat sidebar</span><small>Off: screen only for GM narration</small></label>
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
  </form>`;
  dialog = new Dialog({
    title: 'Narrate | ZFT Cinematics', content,
    buttons: {
      narrate: {
        icon: "<i class='fa-solid fa-book-open'></i>", label: 'Narrate',
        callback: html => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          const value = name => root?.querySelector(`[name="${name}"]`)?.value ?? '';
          const editor = root?.querySelector('[data-zft-narration-editor]');
          if (root?.zftNarrationPendingUploads?.size) {
            ui.notifications?.warn('Narrate: wait for images to finish uploading before sending.');
            return false;
          }
          root?.zftNarrationCommitSource?.();
          captureEditor(root);
          captureWindow();
          persist();
          // Outer defaults are sanitized and shared, so the next empty editor
          // retains the same typography in both the overlay and chat card.
          const align = ['left', 'center', 'right'].includes(prefs.align) ? prefs.align : 'center';
          const font = prefs.fontFamily && getAvailableNarrationFonts().includes(prefs.fontFamily)
            ? ` data-zft-narration-font="${foundry.utils.escapeHTML(prefs.fontFamily)}"` : '';
          const size = prefs.fontSize && Object.hasOwn(SAFE_SIZE_CLASSES, prefs.fontSize)
            ? ` data-zft-narration-size="${prefs.fontSize}"` : '';
          const rawHtml = editor?.innerHTML ?? '';
          const request = {
            type: value('type'), title: value('title'),
            message: editor?.innerText?.trim() ?? editor?.textContent?.trim() ?? '',
            messageHtml: `<div class="zft-narration-document zft-narration-align-${align}"${font}${size}>${rawHtml}</div>`,
            duration: value('closeMode') === 'timed' ? value('duration') : 0,
            postChat: Boolean(root?.querySelector('[name="postChat"]')?.checked)
          };
          void narrate(request).catch(error => {
            console.error(`${LOG} ❌ | Narration submission failed`, error);
            ui.notifications?.error('ZFT Cinematics: narration failed. See console.');
          });
        }
      },
      cancel: { icon: "<i class='fa-solid fa-xmark'></i>", label: 'Cancel' }
    },
    // Sending is only available by explicitly clicking Narrate; never Enter.
    render: html => {
      const root = html instanceof HTMLElement ? html : html?.[0];
      configureNarrationEditor(root, prefs, persist);
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
        const prompt = new Dialog({
          title: 'Narrate | Save to Library',
          content: `<form class="zft-narration-compact-form" onsubmit="return false"><label>Saved passage name</label>
            <input name="narrationName" type="text" maxlength="140" value="${escapeHTML(defaultName)}" autocomplete="off">
            <label>Save in folder</label>
            <div class="zft-narration-save-folder-row"><select name="narrationFolder">${narrationFolderOptions(pack,root.dataset.zftNarrationFolderId??'')}</select>
              <button type="button" data-zft-folder-create title="Create folder">+ Folder</button></div>
            </form>`,
          buttons: {
            save: { label: existing ? 'Update Saved Narration' : 'Save New Narration', callback: form => {
              const pane = form instanceof HTMLElement ? form : form?.[0];
              const name = pane?.querySelector('[name="narrationName"]')?.value.trim();
              if (!name) { ui.notifications?.warn('Narrate: give the passage a name.'); return false; }
              const data = {
                name, folderId:pane?.querySelector('[name="narrationFolder"]')?.value??'',
                html: editor?.innerHTML || '', type: root.querySelector('[name="type"]')?.value,
                title: root.querySelector('[name="title"]')?.value,
                closeMode: root.querySelector('[name="closeMode"]')?.value,
                duration: root.querySelector('[name="duration"]')?.value,
                postChat: root.querySelector('[name="postChat"]')?.checked === true,
                fontFamily: prefs.fontFamily, fontSize: prefs.fontSize, align: prefs.align
              };
              void saveNarrationEntry(data, existing).then(id => {
                if (!id) return;
                // Once a legacy image has been copied, retain its new portable
                // src in the draft too. Don't overwrite edits made during save.
                if (data.portableHtml && editor && editor.innerHTML === data.html) {
                  editor.innerHTML = data.portableHtml;
                  applyNarrationFonts(editor);
                }
                root.dataset.zftNarrationEntryId = id;
                root.dataset.zftNarrationEntryName = name;
                root.dataset.zftNarrationFolderId = data.folderId || '';
                ui.notifications?.info(`Narrate: saved ${name} to ZFT Narrations.`);
              }).catch(error => {
                console.error(`${LOG} ❌ | Save to narration compendium failed`, error);
                ui.notifications?.error(`Narrate: save failed (${error.message}).`);
              });
            } },
            cancel: { label: 'Cancel' }
          }, default: 'cancel',
          render: html => {
            const pane=html instanceof HTMLElement?html:html?.[0];
            const name=pane?.querySelector('[name="narrationName"]');
            name?.focus();
            name?.addEventListener('keydown', event => event.stopPropagation());
            pane?.querySelector('[data-zft-folder-create]')?.addEventListener('click', () => {
              const chooser=pane.querySelector('[name="narrationFolder"]');
              void askNarrationFolderName(pack,{parentId:chooser.value,onSaved: id => {
                chooser.innerHTML=narrationFolderOptions(pack,id||'');
              }});
            });
          }
        }, { width: 485, classes: ['zft-cinematics-narration-popup'] });
        prompt.render(true);
      });
    },
    close: html => {
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
