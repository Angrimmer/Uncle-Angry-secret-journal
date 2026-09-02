import { MODULE_ID } from "../helpers/constants.mjs";
import { INFO_CATALOG } from "../helpers/info-catalog.mjs";
import { TEXTURE_CATALOG, getTextureDefinition } from "../helpers/texture-catalog.mjs";
import { switchToSiblingPage } from "../helpers/sibling-page.mjs";
import { bindIsolatedAutosave } from "../helpers/autosave.mjs";
import { showImagePopout } from "../helpers/image-popout.mjs";
import {
  ensureAmbianceSound,
  stopAmbientSound,
  pickAmbianceSound,
  toggleAmbianceSound,
  transferAmbianceSound,
  isAmbianceSoundPlaying
} from "../helpers/ambient-sound.mjs";
import { InfoChipsCapabilityMixin, applyInfoLockControlLabel } from "../helpers/info-chips-manager.mjs";

const { JournalEntryPageHandlebarsSheet } = foundry.applications.sheets.journal;

const RELATIONS_TYPE = `${MODULE_ID}.relations`;

export class PresentationPageSheet extends InfoChipsCapabilityMixin(JournalEntryPageHandlebarsSheet) {
  /** Catalog read by InfoChipsCapabilityMixin (helpers/info-chips-manager.mjs). */
  static INFO_CATALOG = INFO_CATALOG;

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["uasj-presentation"],
    position: {
      width: 820,
      height: "auto"
    },
    // Replaced by our own per-field autosave (see helpers/autosave.mjs) -
    // the inherited whole-form submitOnChange would resend every field
    // together, letting a stale copy of one field overwrite a concurrent
    // edit made elsewhere on the same document.
    form: {
      submitOnChange: false
    },
    window: {
      icon: "fa-solid fa-id-card",
      controls: [
        {
          action: "uasjConfigurerInfos",
          icon: "fa-solid fa-sliders",
          label: "UASJ.Infos.Configurer",
          ownership: "OWNER"
        },
        {
          action: "uasjVerrouillerInfos",
          icon: "fa-solid fa-lock-open",
          label: "UASJ.Infos.Verrouiller",
          ownership: "OWNER"
        }
      ]
    },
    actions: {
      uasjConfigurerInfos: PresentationPageSheet.onConfigurerInfos,
      uasjVerrouillerInfos: PresentationPageSheet.onVerrouillerInfos,
      uasjVersRelations: PresentationPageSheet.#onVersRelations,
      uasjToggleDescription: PresentationPageSheet.#onToggleDescription,
      uasjInsererImageDescription: PresentationPageSheet.#onInsererImageDescription,
      uasjToggleMode: PresentationPageSheet.#onToggleMode,
      uasjAgrandirPortrait: PresentationPageSheet.#onAgrandirPortrait,
      uasjClicSon: { handler: PresentationPageSheet.#onClicSon, buttons: [0, 2] },
      uasjMontrerJoueurs: PresentationPageSheet.#onMontrerJoueurs
    }
  };

  /**
   * No header part (page-name/heading-level/title-visibility editor, which
   * just duplicated the entry's own name) and no footer part (the manual
   * submit button - autosave replaces it, see _onRender below).
   * @override
   */
  static EDIT_PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/pages/presentation/edit.hbs`,
      classes: ["standard-form"]
    }
  };

  /** @override */
  static VIEW_PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/pages/presentation/view.hbs`,
      root: true
    }
  };

  /* -------------------------------------------- */

  /**
   * Foundry's own DocumentSheetV2 disables every element in form.elements
   * (which includes plain <button>s, not just data-entry fields) whenever
   * the current user can't edit the document - correct for actual form
   * controls, but it swept up the presentation/relations toggle along with
   * them, silently blocking a non-owner (e.g. an observer) from flipping
   * between the two sides of the card even though that's navigation, not
   * editing.
   * @override
   */
  _toggleDisabled(disabled) {
    super._toggleDisabled(disabled);
    this.element.querySelector(".uasj-toggle")?.removeAttribute("disabled");
    this.element.querySelector(".uasj-toggle-description")?.removeAttribute("disabled");
  }

  /** @override */
  _getHeaderControls() {
    const controls = super._getHeaderControls();
    applyInfoLockControlLabel(controls, this);
    return controls;
  }

  /**
   * Montrer aux joueurs / couper-lancer l'ambiance sonore / basculer
   * voir-modifier - always visible in the title bar rather than tucked in
   * the "..." dropdown, per Alex: bien visibles, décalés à gauche, dans cet
   * ordre. The ambiance button alone is shown to everyone, not just the
   * owner - so an observer can at least stop the music, even though only
   * the owner can pick which sound plays (right-click, gated inside
   * #onClicSon) - matches ensureAmbianceSound's own "atmosphere for
   * whoever's looking" reasoning.
   * @override
   */
  _getFrameButtons(options) {
    const buttons = super._getFrameButtons(options);
    const mine = [
      {
        action: "uasjClicSon",
        icon: isAmbianceSoundPlaying(this) ? "fa-solid fa-volume-high" : "fa-solid fa-volume-off",
        label: "UASJ.Ambiance.BoutonHint"
      }
    ];
    if (this.page.isOwner) {
      mine.unshift({ action: "uasjMontrerJoueurs", icon: "fa-solid fa-eye", label: "UASJ.Toggle.MontrerJoueurs" });
      mine.push({
        action: "uasjToggleMode",
        icon: this.isView ? "fa-solid fa-pen" : "fa-solid fa-address-card",
        label: this.isView ? "UASJ.Mode.Modifier" : "UASJ.Mode.Voir"
      });
    }
    buttons.unshift(...mine);
    return buttons;
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    bindIsolatedAutosave(this);
    ensureAmbianceSound(this);
    if (this.isView) {
      this._bindInfoDragging();
      this.#applyCardAppearance();
      this.#bindDescriptionImageClicks();
    }
  }

  /** @inheritDoc */
  close(options) {
    stopAmbientSound(this);
    return super.close(options);
  }

  /**
   * Applies the owner's chosen colours/texture directly, in JS, rather than
   * through a computed inline style in the template.
   *
   * With VIEW_PARTS made of a single "content" part marked root: true,
   * Foundry fuses that part's own template root into this.element itself
   * - .uasj-presentation-view *is* this.element, not a child sitting
   * inside it. querySelector(".uasj-presentation-view") on this.element
   * therefore always returned null (querySelector only ever matches
   * descendants, never the element it's called on), so the colour was
   * computed correctly but silently never applied. Confirmed by
   * inspecting the live app instance's DOM in the console: its own
   * children (.uasj-card-top, ...) showed up as descendants, but
   * .uasj-presentation-view itself never did.
   *
   * Setting it on this.element directly is also safe for the window
   * header/title bar above it: .window-header has its own explicit
   * `background` in Foundry's core CSS, so it keeps its normal look
   * regardless of what colour the surrounding application element has.
   *
   * A texture, when chosen, takes over the background entirely (couleurFond
   * is only relevant for a plain colour) - couleurTexte still applies on
   * top, since the ink colour is a separate choice from the paper itself.
   */
  #applyCardAppearance() {
    const fond = this.page.system.couleurFond?.css;
    const texte = this.page.system.couleurTexte?.css;
    const texture = getTextureDefinition(this.page.system.texture);

    // Sizing/repeat/position go through JS rather than a CSS class, for the
    // same reason couleurFond/couleurTexte do above - keeps every visual
    // property that depends on the owner's choice in one place instead of
    // split between JS and a class the stylesheet cascade could contest.
    if (texture?.image) {
      this.element.style.backgroundImage = `url("${texture.image}")`;
      this.element.style.backgroundSize = "cover";
      this.element.style.backgroundRepeat = "no-repeat";
      this.element.style.backgroundPosition = "center center";
      // A fallback tone behind any transparent part of the image instead
      // of the raw dark app chrome showing through - not the owner's
      // chosen couleurFond, which is reserved for the plain-colour mode.
      this.element.style.backgroundColor = fond || "#c7a86b";
    } else {
      this.element.style.backgroundImage = "";
      this.element.style.backgroundSize = "";
      this.element.style.backgroundRepeat = "";
      this.element.style.backgroundPosition = "";
      this.element.style.backgroundColor = fond || "";
    }

    this.element.style.color = texte || "";
  }

  /**
   * Any <img> inside the description (typed by hand, or dropped in via the
   * "insert image" button) opens the same enlarge popout as every other
   * image in this module - delegated on the container rather than bound
   * per-image, so it also covers images already present before this
   * feature existed (e.g. migrated content), not just newly-inserted ones.
   * Re-bound on every render since root:true's content part is replaced
   * wholesale each time, taking any previously-attached listener with it.
   */
  #bindDescriptionImageClicks() {
    const container = this.element.querySelector(".uasj-presentation-description-view");
    if (!container) return;

    for (const img of container.querySelectorAll("img")) {
      img.dataset.tooltip = game.i18n.localize("UASJ.Image.Agrandir");
    }

    container.addEventListener("click", event => {
      const img = event.target.closest("img");
      if (!img) return;
      showImagePopout(img.src, this.page.system.role || this.document.name);
    });
  }

  /** @inheritDoc */
  async _prepareContentContext(context, options) {
    context.src = this.page.src;
    context.srcInput = this.#createSourceInput.bind(this);
    context.infos = this._resolveInfos();
    context.textures = Object.fromEntries(
      TEXTURE_CATALOG.map(entry => [entry.id, game.i18n.localize(entry.label)])
    );

    if (this.isView) {
      context.role = this.page.system.role;
      context.isOwner = this.page.isOwner;
      context.infosVerrouillees = this.page.system.infosVerrouillees;
      context.description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.page.system.description,
        { relativeTo: this.page, secrets: this.page.isOwner }
      );
    }
  }

  /**
   * Create a FilePicker input for the portrait source field.
   * @param {DataField} field              The source field.
   * @param {FormInputConfig} inputConfig  The form input configuration.
   * @returns {HTMLFilePickerElement}
   */
  #createSourceInput(field, inputConfig) {
    return foundry.applications.elements.HTMLFilePickerElement.create({ type: "image", ...inputConfig });
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #onVersRelations() {
    return switchToSiblingPage(this, RELATIONS_TYPE);
  }

  /**
   * Swaps the right column between the info-chips canvas and the full
   * description text - a pure client-side class toggle (both blocks are
   * always in the DOM, see view.hbs), not a re-render, so no state needs
   * to be tracked on the sheet instance itself.
   */
  static #onToggleDescription() {
    const modeDescription = this.element.classList.toggle("uasj-mode-description");
    const bouton = this.element.querySelector(".uasj-toggle-description");
    if (!bouton) return;
    const icone = bouton.querySelector("i");
    if (icone) icone.className = modeDescription ? "fa-solid fa-id-card" : "fa-solid fa-book";
    bouton.dataset.tooltip = game.i18n.localize(
      modeDescription ? "UASJ.Toggle.VersInfos" : "UASJ.Toggle.VersDescription"
    );
  }

  /**
   * Opens Foundry's own file picker and inserts an <img> tag for the chosen
   * file into the description textarea at the cursor, as raw HTML text -
   * consistent with the "gros texte brut" convention this field already
   * follows (see edit.hbs), same as Lieu/Magasin's own description field.
   * Dispatches a real "change" event afterward so the existing isolated
   * autosave (helpers/autosave.mjs) picks it up and saves it exactly like
   * any other edit to this field, without a separate save path.
   */
  static async #onInsererImageDescription() {
    const FilePickerImpl = foundry.applications.apps.FilePicker.implementation;
    const path = await new Promise(resolve => {
      new FilePickerImpl({ type: "image", callback: resolve }).render(true);
    });
    if (!path) return;

    const textarea = this.element.querySelector('textarea[name="system.description"]');
    if (!textarea) return;

    const balise = `<img src="${path}">`;
    const debut = textarea.selectionStart ?? textarea.value.length;
    const fin = textarea.selectionEnd ?? textarea.value.length;
    textarea.value = textarea.value.slice(0, debut) + balise + textarea.value.slice(fin);
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  }

  static async #onToggleMode() {
    // this.render({mode: ...}) does nothing - an ApplicationV2's options,
    // mode included, are frozen at construction (see helpers/open-page.mjs
    // for the full reasoning), so switching mode means a fresh instance.
    const mode = this.isView ? "edit" : "view";
    const replacement = new this.constructor({ document: this.document, mode });
    // Hand off the playing ambiance before close() would otherwise stop it
    // - a fresh instance re-resolving/replaying the same sound would cut
    // it out and restart it audibly for no reason.
    transferAmbianceSound(this, replacement);
    await this.close();
    replacement.render(true);
  }

  static #onAgrandirPortrait() {
    showImagePopout(this.page.src, this.page.system.role || this.document.name);
  }

  /**
   * Left-click toggles play/stop of the configured ambiance - open to
   * anyone with the card open. Right-click opens the picker to choose
   * which sound plays - owner-only, since that's an editorial choice, not
   * just listening.
   */
  static async #onClicSon(event) {
    if (event.button === 2) {
      if (this.page.isOwner) await pickAmbianceSound(this);
      return;
    }
    await toggleAmbianceSound(this);
  }

  static #onMontrerJoueurs() {
    return foundry.documents.collections.Journal.showDialog(this.page, { parent: this });
  }
}
