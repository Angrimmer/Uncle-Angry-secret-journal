// Sheet instance -> its currently-shown tooltip element, so a sheet closing
// mid-hover can remove it too instead of orphaning it in document.body
// forever (it lives outside the sheet's own DOM subtree, so closing the
// sheet alone doesn't take it with it). Same WeakMap approach as
// autosave.mjs's pendingFocus.
const openTooltips = new WeakMap();

/**
 * Same "hover a truncated bit of text to see it in full" technique used in
 * Mon Système's actor sheet (_onHoverTruncateCell) - any element marked
 * .uasj-truncate gets CSS ellipsis, and hovering it reveals the complete
 * text in a themed popup. Built fresh and appended to document.body rather
 * than living in the sheet's own DOM: a plain position:fixed element
 * INSIDE the sheet isn't reliably viewport-relative here, since Foundry
 * applies a CSS transform (zoom scale) to the window's own root element,
 * which per the CSS spec redefines the containing block for any `fixed`
 * descendant to be that window instead of the screen - escaping to
 * document.body sidesteps that entirely.
 *
 * Bound once per sheet (guarded the same way as bindIsolatedAutosave) via
 * mouseover/mouseout - not mouseenter/mouseleave, since only the bubbling
 * pair works with a single delegated listener on the sheet root; checked
 * against event.relatedTarget so moving within the same element doesn't
 * flicker the tooltip closed and immediately reopened.
 */
export function bindTruncateHover(sheet) {
  const root = sheet.element;
  if (!root || root.dataset.uasjTruncateHover) return;
  root.dataset.uasjTruncateHover = "1";

  const hide = () => {
    openTooltips.get(sheet)?.remove();
    openTooltips.delete(sheet);
  };

  root.addEventListener("mouseover", event => {
    const cell = event.target.closest(".uasj-truncate");
    if (!cell || cell.contains(event.relatedTarget)) return;
    hide();

    // Only worth a tooltip if it's actually clipped - a short value that
    // happens to carry the class shouldn't get a redundant popup.
    if (cell.scrollWidth <= cell.clientWidth) return;
    const text = cell.textContent.trim();
    if (!text) return;

    const tooltip = document.createElement("div");
    tooltip.className = "uasj-truncate-tooltip";
    tooltip.textContent = text;
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
    document.body.appendChild(tooltip);
    openTooltips.set(sheet, tooltip);
  });

  root.addEventListener("mouseout", event => {
    const cell = event.target.closest(".uasj-truncate");
    if (!cell || cell.contains(event.relatedTarget)) return;
    hide();
  });
}

/** Call from a sheet's close() so a tooltip mid-hover doesn't outlive it. */
export function clearTruncateHover(sheet) {
  openTooltips.get(sheet)?.remove();
  openTooltips.delete(sheet);
}
