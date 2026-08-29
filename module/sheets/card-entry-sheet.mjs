import { MODULE_ID } from "../helpers/constants.mjs";
import { getJournalKind } from "../helpers/journal-kinds.mjs";
import { openPageInMode } from "../helpers/open-page.mjs";

const { JournalEntrySheet } = foundry.applications.sheets.journal;

/**
 * Registered for JournalEntry, but never as the world default - only
 * entries created through our kind picker get pinned to it (via
 * flags.core.sheetClass, set at creation in journal-creation.mjs). Its
 * whole job is to never actually show itself: "opening the entry" for a
 * card kind really means "opening its primary page's own sheet" (a clean
 * standalone window already, no journal chrome to strip), so every render
 * request is redirected there instead. Falls back to the normal journal
 * sheet if the primary page can't be found, so an entry never ends up
 * un-openable.
 */
export class CardEntrySheet extends JournalEntrySheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["uasj-carte"]
  };

  /** @override */
  async render(options, renderOptions) {
    const page = this.#primaryPage();
    if (page) {
      // Opens as a card to look at, not a form to fill in - editing is one
      // click away via the pencil control on the page sheet itself.
      await openPageInMode(page, "view");
      return this;
    }
    return super.render(options, renderOptions);
  }

  #primaryPage() {
    const kind = getJournalKind(this.document.getFlag(MODULE_ID, "kind"));
    const primaryType = kind?.pageTypes?.[0];
    return primaryType ? this.document.pages.find(page => page.type === primaryType) : null;
  }
}
