import { MODULE_ID } from "./constants.mjs";

/**
 * Registry of the "kinds" offered when creating a new JournalEntry. Picking
 * a kind auto-creates its starter page(s) - JournalEntry itself has no
 * sub-type in Foundry, only its pages do, so a "kind" here is really just a
 * shortcut for "give me a new entry with these pages inside". Add an entry
 * here for every future journal kind; nothing else needs to change to make
 * a new kind selectable.
 */
export const JOURNAL_KINDS = [
  {
    id: "personnage",
    label: "UASJ.Kinds.Personnage",
    pageTypes: [`${MODULE_ID}.presentation`, `${MODULE_ID}.relations`],
    // Drops the entry's own journal chrome (sidebar, page list, entry-name
    // header) in favor of CardEntrySheet's bare card look - it's a per-kind
    // opt-in since a future kind might actually want the normal multi-page
    // journal browsing behaviour.
    cardSheet: true
  },
  {
    id: "lieu",
    label: "UASJ.Kinds.Lieu",
    // A single page type (tabs inside it, not a second page to flip to -
    // see LieuPageSheet), unlike "personnage"'s two.
    pageTypes: [`${MODULE_ID}.lieu`],
    cardSheet: true
  },
  {
    id: "magasin",
    label: "UASJ.Kinds.Magasin",
    // Same single-page-with-tabs structure as "lieu", plus a Marchandises
    // tab (see MagasinPageSheet).
    pageTypes: [`${MODULE_ID}.magasin`],
    cardSheet: true
  },
  {
    id: "image",
    label: "UASJ.Kinds.Image",
    // Galerie's single-image sibling - see ImagePageModel/ImagePageSheet
    // for why it's a separate kind rather than a one-entry Galerie array.
    // The page type itself is "imageseule", not "image" - that string
    // collides with JournalEntryPage's own reserved core type name and
    // silently breaks documentTypes registration for the whole module
    // (see the comment in uncle-angry-secret-journal.mjs). This kind's own
    // id here is unrelated to that - just our internal picker key.
    pageTypes: [`${MODULE_ID}.imageseule`],
    cardSheet: true
  },
  {
    id: "galerie",
    label: "UASJ.Kinds.Galerie",
    // Deliberately minimal, no relation to the other kinds' shared
    // capabilities (ambiance/relations/infos) - see GaleriePageSheet.
    pageTypes: [`${MODULE_ID}.galerie`],
    cardSheet: true
  }
];

export function getJournalKind(id) {
  return JOURNAL_KINDS.find(kind => kind.id === id) ?? null;
}
