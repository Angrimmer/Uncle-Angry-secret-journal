/**
 * Foundry's own ImagePopout ships a native "Show Image" action (broadcasts
 * to every connected player) but tucks it inside its own "..." dropdown
 * (window.controls), GM-only. Every other action in this module has been
 * pulled out of that dropdown into an always-visible title bar button
 * (Alex's explicit, repeated preference) - this small subclass does the
 * same to the one native control we didn't write ourselves, rather than
 * leaving it as the odd one out. _getFrameButtons/_getHeaderControls don't
 * apply the control's own `visible` gate (that's a _headerControlButtons-
 * only mechanism), so the GM check is re-applied by hand here.
 */
class UasjImagePopout extends foundry.applications.apps.ImagePopout {
  /** @override */
  _getFrameButtons(options) {
    const buttons = super._getFrameButtons(options);
    if (game.user.isGM) {
      buttons.unshift({ action: "shareImage", icon: "fa-solid fa-eye", label: "JOURNAL.ActionShow" });
    }
    return buttons;
  }

  /** @override */
  _getHeaderControls() {
    // Drop the native dropdown entry now that it's a frame button instead -
    // avoids showing the same action twice.
    return super._getHeaderControls().filter(control => control.action !== "shareImage");
  }
}

/**
 * Thin wrapper around Foundry's own image popout - the same component used
 * to enlarge an actor's portrait. Kept as a one-liner helper (rather than
 * every sheet calling the constructor directly) so every "click this image
 * to see it bigger" spot in the module goes through one place.
 */
export function showImagePopout(src, title) {
  if (!src) return;
  new UasjImagePopout({
    src,
    window: { title }
  }).render({ force: true });
}
