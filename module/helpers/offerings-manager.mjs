import { showImagePopout } from "./image-popout.mjs";

/**
 * Best-effort read of an Item's own description - unlike name/img, Foundry
 * has no universal description field on Item, since every game system
 * defines its own system.* schema differently (this module has no business
 * assuming one, to stay usable across systems for a public release). Tries
 * the conventions most systems actually use, in order: a flat string at
 * system.description (Mon Système's own shape), an object with a .value
 * string (dnd5e, pf2e, and several others copy that pattern), or an object
 * split into .public/.private (Crucible) - .public only, deliberately never
 * .private: a shop's listing is shown to every viewer, so leaking a secret
 * description there would be the wrong default, same reasoning as this
 * module's own relations only showing texteIntime to people on the
 * visibility list. Falls back to blank rather than guessing further for
 * anything else - a best-effort, not a guarantee, so the shop stays useful
 * either way.
 */
function resolveItemDescription(item) {
  const raw = item.system?.description;
  if (typeof raw === "string") return raw;
  if (typeof raw?.value === "string") return raw.value;
  if (typeof raw?.public === "string") return raw.public;
  return "";
}

function resolveItemIdentity(item) {
  return { img: item.img ?? "", nom: item.name, description: resolveItemDescription(item) };
}

/**
 * Re-resolves an offering's img/nom/description from its linked Item, if
 * it still exists - falling back to the offering's own stored img/nom (a
 * stale-but-present last-known snapshot) if the item was deleted since, so
 * a broken link degrades gracefully instead of showing a blank icon/name.
 * description isn't part of the persisted schema (only a display extra,
 * unlike img/nom) - it's just blank once the item's gone, same as
 * introuvable indicates. introuvable lets the templates show a small
 * warning instead of silently displaying stale data with no indication
 * anything's wrong - relations' withLiveIdentity doesn't expose this,
 * offerings do since a shop's stock pointing at a deleted item is more
 * likely to matter to Alex than a broken relation link.
 */
export async function withLiveOfferingIdentity(offering) {
  if (!offering.itemUuid) return { ...offering, introuvable: false, description: "" };
  const linked = await fromUuid(offering.itemUuid);
  if (!linked) return { ...offering, introuvable: true, description: "" };
  return { ...offering, ...resolveItemIdentity(linked), introuvable: false };
}

/**
 * Adds "a list of offerings, linkable via drag-drop/search to a real Item,
 * edited one at a time in an open/close accordion" to any
 * JournalEntryPageHandlebarsSheet whose data model has an "offerings" array
 * shaped like offeringSchema() (data/magasin-page.mjs). Structurally a
 * mirror of RelationsCapabilityMixin (helpers/relations-manager.mjs), just
 * linking Item instead of JournalEntry - kept as a fully independent set of
 * names (Offering rather than Relation everywhere, including generically-
 * named methods like _bindSearchWrap) rather than reusing relations-manager
 * internals: MagasinPageSheet combines both mixins on the same instance, and
 * an ordinary (non-#private) method lives on the shared prototype chain -
 * two mixins declaring the same method name would silently shadow each
 * other depending on mixin order. #private fields (#editingOfferingIndex
 * etc.) don't have this problem (lexically scoped per class body), but are
 * kept mirrored in naming anyway for consistency.
 *
 * There's no "unlinked, manual entry" state to support here (unlike
 * relations): an offering is only ever created already pointing at a
 * resolved Item (see _creerOfferingDepuisItem), so the edit template never
 * needs a branch for "no itemUuid yet".
 */
export const OfferingsCapabilityMixin = Base => class extends Base {
  /** @type {number|null} */
  #editingOfferingIndex = null;

  /** @type {foundry.applications.ux.DragDrop|null} */
  #offeringsDragDropInstance = null;

  /**
   * Same DragDrop controller Foundry's own ActorSheet uses for dropping an
   * Item onto the sheet. No dragSelector: nothing here is itself draggable,
   * it's only ever a drop target for Items dragged in from elsewhere (the
   * sidebar directory, a compendium, an actor's inventory).
   */
  get _offeringsDragDrop() {
    return (this.#offeringsDragDropInstance ??= new foundry.applications.ux.DragDrop({
      dropSelector: ".uasj-offering-drop, .uasj-offering-drop-nouvelle",
      permissions: {
        drop: () => this.page.isOwner
      },
      callbacks: {
        dragenter: event => event.currentTarget.classList.add("uasj-offering-drop-active"),
        dragleave: event => event.currentTarget.classList.remove("uasj-offering-drop-active"),
        drop: this._onOfferingDrop.bind(this)
      }
    }));
  }

  /** Call once from a sheet's _onRender, in both view and edit mode. */
  _bindOfferingsBehavior() {
    this._offeringsDragDrop.bind(this.element);
    if (this.isView) this._bindOfferingsFilter();
    else this._bindOfferingSearch();
  }

  /**
   * Dropping an existing Item (from the sidebar, a compendium, or an
   * actor's inventory - fromUuid/fromDropData resolve all three the same
   * way) either links it into one specific offering's drop zone, or -
   * dropped on the standalone zone at the top instead - creates a brand new
   * offering from it.
   */
  async _onOfferingDrop(event) {
    const zone = event.currentTarget;
    zone.classList.remove("uasj-offering-drop-active");

    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data?.type !== "Item") {
      ui.notifications.warn(game.i18n.localize("UASJ.Offerings.DropInvalide"));
      return;
    }

    const documentClass = foundry.utils.getDocumentClass(data.type);
    const item = await documentClass.fromDropData(data);
    if (!item) return;

    if (zone.classList.contains("uasj-offering-drop-nouvelle")) await this._creerOfferingDepuisItem(item);
    else await this._applyItemToOffering(Number(zone.dataset.index), item);
  }

  /**
   * View-mode search bar - filters the already-listed offerings by name,
   * pure client-side show/hide (each card already carries its own
   * data-nom). Distinct from _bindOfferingSearch below, which searches
   * game.items to link/create one.
   */
  _bindOfferingsFilter() {
    const input = this.element.querySelector(".uasj-offerings-search");
    if (!input) return;
    input.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();
      for (const card of this.element.querySelectorAll(".uasj-offering-card")) {
        const nom = (card.dataset.nom ?? "").toLowerCase();
        card.classList.toggle("uasj-offering-hidden", query.length > 0 && !nom.includes(query));
      }
    });
  }

  /**
   * Lets the owner type a few letters of an existing item's name and click
   * it, instead of dragging it in - the same two outcomes as dropping (link
   * an existing offering, or create a new one from the standalone search at
   * the top). Searches game.items only, not compendiums - same limit as
   * relations' search over game.journal, kept consistent on purpose.
   */
  _bindOfferingSearch() {
    for (const row of this.element.querySelectorAll(".uasj-offering-row")) {
      const index = Number(row.querySelector(".uasj-offering-drop")?.dataset.index);
      this._bindOfferingSearchWrap(row.querySelector(".uasj-offering-search"), item => this._applyItemToOffering(index, item));
    }
    this._bindOfferingSearchWrap(
      this.element.querySelector(".uasj-offering-nouvelle .uasj-offering-search"),
      item => this._creerOfferingDepuisItem(item)
    );
  }

  _bindOfferingSearchWrap(wrap, onSelect) {
    if (!wrap) return;
    const input = wrap.querySelector(".uasj-offering-search-input");
    const results = wrap.querySelector(".uasj-offering-search-results");

    input.addEventListener("input", () => this._renderOfferingSearchResults(input, results, onSelect));
    // Delayed rather than instant, so a click on a result (mousedown then
    // blur then click) still lands before the list disappears under it.
    input.addEventListener("blur", () => setTimeout(() => (results.innerHTML = ""), 150));
  }

  _renderOfferingSearchResults(input, results, onSelect) {
    const query = input.value.trim().toLowerCase();
    results.innerHTML = "";
    if (!query) return;

    const matches = game.items.filter(item => item.name.toLowerCase().includes(query)).slice(0, 6);
    for (const item of matches) {
      const el = document.createElement("div");
      el.className = "uasj-offering-search-result uasj-truncate";
      el.textContent = item.name;
      // mousedown + preventDefault, not click: stops the input from
      // blurring (and the blur handler above from wiping the list) before
      // the selection below gets a chance to run.
      el.addEventListener("mousedown", event => {
        event.preventDefault();
        onSelect(item);
        input.value = "";
        results.innerHTML = "";
      });
      results.appendChild(el);
    }
  }

  /**
   * Links an offering to an existing Item - shared by the drag-drop and
   * search paths above. img/nom are seeded from it once here purely as the
   * fallback snapshot for if the link ever breaks (see
   * withLiveOfferingIdentity); the actual displayed values are re-resolved
   * live from the target every time, not read back from these.
   */
  async _applyItemToOffering(index, item) {
    // Document#update replaces an array wholesale rather than merging into
    // one of its elements (see helpers/autosave.mjs) - resend the whole
    // array instead of a dotted path into it.
    const offerings = this.page.system.toObject().offerings;
    offerings[index] = { ...offerings[index], ...resolveItemIdentity(item), itemUuid: item.uuid };
    await this.page.update({ "system.offerings": offerings });
  }

  /**
   * The standalone drop/search zone's counterpart to _applyItemToOffering:
   * appends a brand new offering instead of filling an existing one. Always
   * created already linked - there's no manual/unlinked offering.
   */
  async _creerOfferingDepuisItem(item) {
    const offerings = this.page.system.toObject().offerings;
    offerings.push({
      itemUuid: item.uuid,
      ...resolveItemIdentity(item),
      prix: "",
      quantite: ""
    });
    await this.page.update({ "system.offerings": offerings });
  }

  /**
   * Fills context.offerings (list mode) or context.editingOffering
   * (accordion open on one) - matches what
   * templates/partials/offerings-panel-edit.hbs expects. Call from a
   * sheet's _prepareContentContext, in edit mode.
   */
  async _prepareOfferingsEditContext(context) {
    const offerings = await Promise.all(
      this.page.system.offerings.map(async (offering, index) => ({ ...(await withLiveOfferingIdentity(offering)), index }))
    );

    if (this.#editingOfferingIndex !== null && offerings[this.#editingOfferingIndex]) {
      context.editingOffering = offerings[this.#editingOfferingIndex];
    } else {
      this.#editingOfferingIndex = null;
      context.offerings = offerings;
    }
  }

  /**
   * Fills context.offerings for read-only display - matches what
   * templates/partials/offerings-panel-view.hbs expects. Call from a
   * sheet's _prepareContentContext, in view mode.
   */
  async _prepareOfferingsViewContext(context) {
    const isOwner = this.page.isOwner;
    context.offerings = await Promise.all(this.page.system.offerings.map(async offering => {
      const resolved = await withLiveOfferingIdentity(offering);
      if (!resolved.description) return resolved;
      // Enriched (not just escaped) since the source system's own
      // description field may itself hold rich text (@UUID links, etc.).
      return {
        ...resolved,
        description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(resolved.description, {
          relativeTo: this.page,
          secrets: isOwner
        })
      };
    }));
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static onOuvrirOffering(event, target) {
    this.#editingOfferingIndex = Number(target.dataset.index);
    this.render();
  }

  static onValiderOffering() {
    this.#editingOfferingIndex = null;
    this.render();
  }

  static async onSupprimerOffering(event, target) {
    const offerings = this.page.system.toObject().offerings;
    offerings.splice(Number(target.dataset.index), 1);
    this.#editingOfferingIndex = null;
    await this.page.update({ "system.offerings": offerings });
  }

  static onAgrandirIconeOffering(event, target) {
    showImagePopout(target.dataset.src, target.dataset.nom);
  }

  /** Opens the linked item's own sheet - items have no "primary page" concept to redirect to, unlike a relation's linked journal. */
  static async onVoirItem(event, target) {
    const item = await fromUuid(target.dataset.uuid);
    if (!item) {
      ui.notifications.warn(game.i18n.localize("UASJ.Offerings.ItemIntrouvable"));
      return;
    }
    item.sheet.render(true);
  }
};
