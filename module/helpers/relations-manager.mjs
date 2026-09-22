import { MODULE_ID } from "./constants.mjs";
import { openPageInMode } from "./open-page.mjs";
import { showImagePopout } from "./image-popout.mjs";
import { getJournalKind } from "./journal-kinds.mjs";

const PRESENTATION_TYPE = `${MODULE_ID}.presentation`;

const BLANK_RELATION = {
  img: "",
  nom: "",
  titre: "",
  journalUuid: "",
  textePublic: "",
  texteIntime: "",
  intimeVisibleA: []
};

/**
 * A character's portrait/name only ever change on their own presentation
 * page - the person who owns that journal is the only one who can touch
 * them. So a relation linked to one (journalUuid set) doesn't keep its own
 * independent copy of img/nom: every place it's displayed re-reads them
 * live from the target, and edits there show up everywhere that relation
 * appears without anyone needing to go update each copy by hand.
 *
 * Not every linked entry is a Personnage though - a relation can just as
 * well point at a Lieu or a Magasin, whose icon lives on their own single
 * page (its native `src`), not under a "presentation" page type. Find
 * whichever page is that entry's actual primary page (same lookup
 * CardEntrySheet itself uses to decide what to open) rather than assuming
 * "presentation" is the only shape a linked card can have.
 */
function resolveIdentity(entry) {
  const kind = getJournalKind(entry.getFlag(MODULE_ID, "kind"));
  const primaryType = kind?.pageTypes?.[0];
  const primaryPage = primaryType ? entry.pages?.find(page => page.type === primaryType) : null;
  return {
    img: primaryPage?.src ?? entry.img ?? "",
    nom: entry.name
  };
}

/**
 * Re-resolves a relation's img/nom from its linked journal, if it has one
 * and it still exists - falling back to the relation's own stored values
 * (a stale-but-present last-known snapshot) if the link is set but the
 * journal was deleted since, so a broken link degrades gracefully instead
 * of showing a blank portrait/name.
 */
export async function withLiveIdentity(relation) {
  if (!relation.journalUuid) return relation;
  const linked = await fromUuid(relation.journalUuid);
  if (!linked) return relation;
  return { ...relation, ...resolveIdentity(linked) };
}

/**
 * Same live re-resolution as withLiveIdentity, but for read-only display to
 * a specific viewer (game.user) instead of the page owner's own edit form.
 * A relation linked to a journal the current viewer can't even observe
 * (Document#visible, false for anyone below Limited - GM excepted) resolves
 * to null - the caller (_prepareRelationsViewContext) drops it from the
 * list entirely, rather than leaking that target's real name/portrait, or
 * even the fact that a relation to *someone* exists there, just because
 * someone else wrote about them here.
 */
export async function withViewableIdentity(relation) {
  if (!relation.journalUuid) return relation;
  const linked = await fromUuid(relation.journalUuid);
  if (!linked) return relation;
  if (!linked.visible) return null;
  return { ...relation, ...resolveIdentity(linked) };
}

/**
 * Adds "a list of relations, linkable via drag-drop/search to an existing
 * journal, edited one at a time in an open/close accordion" to any
 * JournalEntryPageHandlebarsSheet whose data model has a "relations" array
 * shaped like relationSchema() (data/relations-page.mjs). Shared by the
 * standalone Relations page and any other card with its own relations tab
 * (e.g. Lieu) - templates/partials/relations-panel-edit.hbs and
 * relations-panel-view.hbs are the matching reusable templates.
 *
 * A mixin rather than a plain set of helper functions: several pieces
 * (the DragDrop instance, which relation is currently open) are genuinely
 * per-sheet-instance state, and the header-control actions it wires need
 * to live in a class body a subclass's DEFAULT_OPTIONS.actions can
 * actually reference by name - a #private static method declared here
 * wouldn't be reachable from a subclass's own class body, even though the
 * subclass extends this. The action methods below are therefore plain
 * (non-#private) statics; #editingIndex/#dragDropInstance stay truly
 * private since only methods declared in this same class body ever touch
 * them, static action handlers included (private field access is
 * resolved lexically, not by static/instance).
 */
export const RelationsCapabilityMixin = Base => class extends Base {
  /**
   * Index of the one relation currently open for editing, or null to show
   * the compact list instead - every field of every relation being open
   * at once makes the form both hard to scroll through and hard to get
   * your bearings in. Reset on delete since the deleted index (or worse,
   * a wrong one after the array shifts) can't stay valid.
   * @type {number|null}
   */
  #editingIndex = null;

  /** @type {foundry.applications.ux.DragDrop|null} */
  #dragDropInstance = null;

  /**
   * Same DragDrop controller Foundry's own ActorSheet uses for dropping an
   * Item onto the sheet - not a hand-rolled dragover/drop listener pair.
   * No dragSelector: nothing here is itself draggable, it's only ever a
   * drop target for documents dragged in from elsewhere (the sidebar
   * directory, a compendium, ...).
   */
  get _relationsDragDrop() {
    return (this.#dragDropInstance ??= new foundry.applications.ux.DragDrop({
      dropSelector: ".uasj-relation-drop, .uasj-relation-drop-nouvelle",
      permissions: {
        drop: () => this.page.isOwner
      },
      callbacks: {
        dragenter: event => event.currentTarget.classList.add("uasj-relation-drop-active"),
        dragleave: event => event.currentTarget.classList.remove("uasj-relation-drop-active"),
        drop: this._onRelationDrop.bind(this)
      }
    }));
  }

  /** Call once from a sheet's _onRender, in both view and edit mode. */
  _bindRelationsBehavior() {
    this._relationsDragDrop.bind(this.element);
    if (this.isView) this._bindRelationsFilter();
    else this._bindRelationSearch();
  }

  /**
   * The view-mode search bar (relations-panel-view.hbs's
   * .uasj-relations-search) filters the already-listed relations by name -
   * distinct from _bindRelationSearch above, which searches game.journal to
   * link/create one. Each card carries its own data-nom already, so this is
   * pure client-side show/hide, no re-render needed.
   */
  _bindRelationsFilter() {
    const input = this.element.querySelector(".uasj-relations-search");
    if (!input) return;
    input.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();
      for (const card of this.element.querySelectorAll(".uasj-relation-card")) {
        const nom = (card.dataset.nom ?? "").toLowerCase();
        card.classList.toggle("uasj-relation-hidden", query.length > 0 && !nom.includes(query));
      }
    });
  }

  /**
   * Dropping an existing JournalEntry (from the sidebar directory) either
   * links it into one specific relation's drop zone, or - dropped on the
   * standalone zone at the top instead - creates a brand new relation from
   * it. Relations only ever come from an existing journal; there's no
   * blank/manual-entry creation path.
   */
  async _onRelationDrop(event) {
    const zone = event.currentTarget;
    zone.classList.remove("uasj-relation-drop-active");

    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data?.type !== "JournalEntry") {
      ui.notifications.warn(game.i18n.localize("UASJ.Relations.DropInvalide"));
      return;
    }

    const documentClass = foundry.utils.getDocumentClass(data.type);
    const entry = await documentClass.fromDropData(data);
    if (!entry) return;

    if (zone.classList.contains("uasj-relation-drop-nouvelle")) await this._creerRelationDepuisEntry(entry);
    else await this._applyEntryToRelation(Number(zone.dataset.index), entry);
  }

  /**
   * Lets the owner type a few letters of an existing character's name and
   * click it, instead of dragging a journal in from the sidebar directory -
   * the same two outcomes as dropping (link an existing relation, or
   * create a new one from the standalone search at the top), through a
   * second, more discoverable path.
   */
  _bindRelationSearch() {
    for (const row of this.element.querySelectorAll(".uasj-relation-row")) {
      const index = Number(row.querySelector(".uasj-relation-drop")?.dataset.index);
      this._bindSearchWrap(row.querySelector(".uasj-relation-search"), entry => this._applyEntryToRelation(index, entry));
    }
    this._bindSearchWrap(
      this.element.querySelector(".uasj-relation-nouvelle .uasj-relation-search"),
      entry => this._creerRelationDepuisEntry(entry)
    );
  }

  _bindSearchWrap(wrap, onSelect) {
    if (!wrap) return;
    const input = wrap.querySelector(".uasj-relation-search-input");
    const results = wrap.querySelector(".uasj-relation-search-results");

    input.addEventListener("input", () => this._renderRelationSearchResults(input, results, onSelect));
    // Delayed rather than instant, so a click on a result (mousedown then
    // blur then click) still lands before the list disappears under it.
    input.addEventListener("blur", () => setTimeout(() => (results.innerHTML = ""), 150));
  }

  _renderRelationSearchResults(input, results, onSelect) {
    const query = input.value.trim().toLowerCase();
    results.innerHTML = "";
    if (!query) return;

    const matches = game.journal.filter(entry => entry.name.toLowerCase().includes(query)).slice(0, 6);
    for (const entry of matches) {
      const item = document.createElement("div");
      item.className = "uasj-relation-search-result uasj-truncate";
      item.textContent = entry.name;
      // mousedown + preventDefault, not click: stops the input from
      // blurring (and the blur handler above from wiping the list) before
      // the selection below gets a chance to run.
      item.addEventListener("mousedown", event => {
        event.preventDefault();
        onSelect(entry);
        input.value = "";
        results.innerHTML = "";
      });
      results.appendChild(item);
    }
  }

  /**
   * Links a relation to an existing JournalEntry - shared by the drag-drop
   * and search paths above. img/nom are seeded from it once here purely as
   * the fallback snapshot for if the link ever breaks (see
   * withLiveIdentity); the actual displayed values are re-resolved live
   * from the target every time, not read back from these.
   */
  async _applyEntryToRelation(index, entry) {
    // Document#update replaces an array wholesale rather than merging into
    // one of its elements (see helpers/autosave.mjs) - resend the whole
    // array instead of a dotted path into it.
    const relations = this.page.system.toObject().relations;
    relations[index] = { ...relations[index], ...resolveIdentity(entry), journalUuid: entry.uuid };
    await this.page.update({ "system.relations": relations });
  }

  /**
   * The standalone drop/search zone's counterpart to _applyEntryToRelation:
   * appends a brand new relation instead of filling an existing one.
   */
  async _creerRelationDepuisEntry(entry) {
    const relations = this.page.system.toObject().relations;
    relations.push({
      ...foundry.utils.deepClone(BLANK_RELATION),
      ...resolveIdentity(entry),
      journalUuid: entry.uuid
    });
    await this.page.update({ "system.relations": relations });
  }

  /**
   * Fills context.relations (list mode) or context.editingRelation
   * (accordion open on one) - matches what
   * templates/partials/relations-panel-edit.hbs expects. Call from a
   * sheet's _prepareContentContext, in edit mode.
   */
  async _prepareRelationsEditContext(context) {
    context.utilisateurs = Object.fromEntries(game.users.contents.map(user => [user.id, user.name]));
    const relations = await Promise.all(
      this.page.system.relations.map(async (relation, index) => ({ ...(await withLiveIdentity(relation)), index }))
    );

    if (this.#editingIndex !== null && relations[this.#editingIndex]) {
      context.editingRelation = relations[this.#editingIndex];
    } else {
      this.#editingIndex = null;
      context.relations = relations;
    }
  }

  /**
   * Fills context.relations for read-only display - matches what
   * templates/partials/relations-panel-view.hbs expects. Drops the
   * intimate text for anyone who isn't the page owner and isn't on that
   * specific relation's own viewer list, and drops the whole relation card
   * for one linked to a journal this viewer has no rights to
   * (withViewableIdentity resolves those to null) - unlike edit mode
   * (owner-only, always the real identity via withLiveIdentity), this is
   * shown to every viewer of the card, including ones the linked journal
   * was never meant to be visible to. Call from a sheet's
   * _prepareContentContext, in view mode.
   */
  async _prepareRelationsViewContext(context) {
    const isOwner = this.page.isOwner;
    const userId = game.user.id;
    const relations = await Promise.all(this.page.system.relations.map(async relation => {
      const identity = await withViewableIdentity(relation);
      if (!identity) return null;
      const { img, nom, titre, journalUuid } = identity;
      const canSeeIntime = isOwner || relation.intimeVisibleA.has(userId);
      return {
        img,
        nom,
        titre,
        journalUuid,
        textePublic: await foundry.applications.ux.TextEditor.implementation.enrichHTML(relation.textePublic, {
          relativeTo: this.page,
          secrets: isOwner
        }),
        texteIntime: canSeeIntime
          ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(relation.texteIntime, { relativeTo: this.page, secrets: isOwner })
          : null
      };
    }));
    context.relations = relations.filter(relation => relation !== null);
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static onOuvrirRelation(event, target) {
    this.#editingIndex = Number(target.dataset.index);
    this.render();
  }

  static onValiderRelation() {
    this.#editingIndex = null;
    this.render();
  }

  static async onSupprimerRelation(event, target) {
    const relations = this.page.system.toObject().relations;
    relations.splice(Number(target.dataset.index), 1);
    this.#editingIndex = null;
    await this.page.update({ "system.relations": relations });
  }

  static onAgrandirPortrait(event, target) {
    showImagePopout(target.dataset.src, target.dataset.nom);
  }

  /**
   * Only present for a relation actually linked to a journal. Opens the
   * linked character's own presentation card rather than a generic
   * journal sheet, consistent with how the rest of the module treats a
   * "personnage" journal as a card, not a document to read raw.
   */
  static async onVoirJournal(event, target) {
    const entry = await fromUuid(target.dataset.uuid);
    if (!entry) {
      ui.notifications.warn(game.i18n.localize("UASJ.Relations.JournalIntrouvable"));
      return;
    }
    const presentation = entry.pages?.find(page => page.type === PRESENTATION_TYPE);
    if (presentation) openPageInMode(presentation, "view");
    else entry.sheet.render(true);
  }
};
