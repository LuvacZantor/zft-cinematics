/*
 * ZFT Cinematics Narrate toolbar color compatibility, v0.2.0-dev.26.
 * The existing Narrate stylesheet intentionally retains amber/emerald defaults.
 * This narrowly scoped rule only appears when ZFT Tools has an explicit custom
 * color for Narrate, giving that choice precedence over legacy !important CSS.
 * No change is made to any other Cinematics UI.
 */
const MODULE = "zft-cinematics";
const TOOLS = "zft-tools";
const ACTION = "zft-cinematics-narrate";
const STYLE_ID = "zft-cinematics-narrate-color-override";
const HEX = /^#[0-9a-f]{6}$/i;

function applyNarrateToolbarColor() {
  const previous = document.getElementById(STYLE_ID);
  if (!game.modules.get(TOOLS)?.active || !game.user) {
    previous?.remove();
    return;
  }
  let color;
  try {
    const layouts = game.settings.get(TOOLS, "roleLayouts") ?? {};
    color = layouts[game.user.isGM ? "gm" : "player"]?.colors?.[ACTION];
  } catch (_) {
    // Older ZFT Tools versions may not have the role-based setting.
  }
  if (typeof color !== "string" || !HEX.test(color)) {
    previous?.remove();
    return;
  }
  const selector = `#scene-controls#scene-controls :is([data-tool="${ACTION}"],[data-action="${ACTION}"])`;
  const rule = `${selector}, ${selector} :is(i,svg,.control-icon), ${selector} svg :is(path,use) { color: ${color} !important; }`;
  const style = previous ?? document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = rule;
  document.head.appendChild(style);
}

Hooks.once("ready", () => {
  applyNarrateToolbarColor();
  Hooks.on("renderSceneControls", applyNarrateToolbarColor);
  Hooks.on("updateSetting", (setting) => {
    if (setting?.key === `${TOOLS}.roleLayouts`) applyNarrateToolbarColor();
  });
});
