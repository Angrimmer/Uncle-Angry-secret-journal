import { openPageInMode } from "./open-page.mjs";

/**
 * Flips from one card to the other side of the same character: closes the
 * current page sheet and opens its sibling of the given type within the
 * same JournalEntry, in view mode (a flip shows the other card to look at,
 * not a form). Both "presentation" and "relations" pages are created
 * together at journal creation (see journal-creation.mjs), so a sibling is
 * normally there; if it's missing (deleted since, or an older entry) we
 * just say so instead of failing silently.
 */
export async function switchToSiblingPage(sheet, siblingType) {
  const sibling = sheet.page.parent?.pages.find(page => page.type === siblingType);
  if (!sibling) {
    ui.notifications.warn(game.i18n.localize("UASJ.Toggle.Absente"));
    return;
  }
  await sheet.close();
  openPageInMode(sibling, "view");
}
