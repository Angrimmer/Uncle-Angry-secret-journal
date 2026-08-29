/**
 * Opens a page's own sheet in a specific mode (edit/view), as a brand new
 * instance. An ApplicationV2's options - mode included - are frozen at
 * construction and never change on a later render() call, so
 * `page.sheet.render({mode: "view"})` silently does nothing: `page.sheet`
 * is a cached instance built the first time it's ever accessed, always in
 * the default "edit" mode, and no later render can move it out of that
 * mode. The only way to get a specific mode is to construct a fresh
 * instance with it from the start.
 */
export function openPageInMode(page, mode) {
  const classes = CONFIG.JournalEntryPage.sheetClasses[page.type] ?? {};
  const entry = Object.values(classes).find(c => c.default) ?? Object.values(classes)[0];
  if (!entry) return page.sheet.render(true);
  return new entry.cls({ document: page, mode }).render(true);
}
