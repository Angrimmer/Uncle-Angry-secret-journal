import { MODULE_ID } from "../helpers/constants.mjs";
import { switchToSiblingPage } from "../helpers/sibling-page.mjs";
import { bindIsolatedAutosave } from "../helpers/autosave.mjs";
import { bindTruncateHover, clearTruncateHover } from "../helpers/truncate-hover.mjs";
import { RelationsCapabilityMixin } from "../helpers/relations-manager.mjs";
import {
  ensureAmbianceSound,
  stopAmbientSound,
  pickAmbianceSound,
  toggleAmbianceSound,
  transferAmbianceSound,
  isAmbianceSoundPlaying
} from "../helpers/ambient-sound.mjs";

const { JournalEntryPageHandlebarsSheet } = foundry.applications.sheets.journal;

const PRESENTATION_TYPE = `${MODULE_ID}.presentation`;

export class RelationsPageSheet extends RelationsCapabilityMixin(JournalEntryPageHandlebarsSheet) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["uasj-relations"],
    position: {
      width: 480,
      height: 640
    },
    // Replaced by our own per-field autosave (see helpers/autosave.mjs).
    form: {
      submitOnChange: false
    },
    window: {
      icon: "fa-solid fa-people-arrows"
    },
    actions: {
      uasjVersPresentation: RelationsPageSheet.#onVersPresentation,
      uasjOuvrirRelation: RelationsPageSheet.onOuvrirRelation,
      uasjValiderRelation: RelationsPageSheet.onValiderRelation,
      uasjSupprimerRelation: RelationsPageSheet.onSupprimerRelation,
      uasjToggleMode: RelationsPageSheet.#onToggleMode,
      uasjAgrandirPortrait: RelationsPageSheet.onAgrandirPortrait,
      uasjVoirJournal: RelationsPageSheet.onVoirJournal,
      uasjClicSon: { handler: RelationsPageSheet.#onClicSon, buttons: [0, 2] },
      uasjMontrerJoueurs: RelationsPageSheet.#onMontrerJoueurs
    }
  };

  /**
   * No header or footer part - same reasoning as PresentationPageSheet.
   * @override
   */
  static EDIT_PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/pages/relations/edit.hbs`,
      classes: ["standard-form"],
      scrollable: [""]
    }
  };

  /** @override */
  static VIEW_PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/pages/relations/view.hbs`,
      root: true,
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */

  /**
   * Foundry's own DocumentSheetV2 disables every element in form.elements
   * (which includes plain <button>s and this view's own search <input>, not
   * just data-entry fields) whenever the current user can't edit the
   * document - correct for actual form controls, but it swept up the
   * presentation/relations toggle and the view-mode relations search bar
   * along with them, silently blocking a non-owner (e.g. an observer) from
   * flipping between the two sides of the card or filtering the relations
   * list, even though neither one edits anything - _bindRelationsFilter
   * (helpers/relations-manager.mjs) is pure client-side show/hide, already
   * bound regardless of ownership.
   * @override
   */
  _toggleDisabled(disabled) {
    super._toggleDisabled(disabled);
    this.element.querySelector(".uasj-toggle")?.removeAttribute("disabled");
    this.element.querySelector(".uasj-relations-search")?.removeAttribute("disabled");
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
    bindTruncateHover(this);
    ensureAmbianceSound(this);
    this._bindRelationsBehavior();
    if (this.isView) this.#applyCardAppearance();
  }

  /** @inheritDoc */
  close(options) {
    clearTruncateHover(this);
    stopAmbientSound(this);
    return super.close(options);
  }

  /**
   * The relations card has no colour pickers of its own - it borrows
   * couleurFond from the sibling presentation page, so both sides of the
   * same character's card stay visually consistent instead of drifting
   * apart. couleurTexte is deliberately left out for now: a text colour
   * tuned for a short name/title on the presentation card could easily be
   * too much across paragraphs of relation prose here.
   */
  #applyCardAppearance() {
    const presentation = this.page.parent?.pages.find(page => page.type === PRESENTATION_TYPE);
    const fond = presentation?.system.couleurFond?.css;
    this.element.style.backgroundColor = fond || "";
  }

  /** @inheritDoc */
  async _prepareContentContext(context, options) {
    if (this.isView) await this._prepareRelationsViewContext(context);
    else await this._prepareRelationsEditContext(context);
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #onVersPresentation() {
    return switchToSiblingPage(this, PRESENTATION_TYPE);
  }

  static async #onToggleMode() {
    // See PresentationPageSheet#onToggleMode / helpers/open-page.mjs -
    // mode is frozen at construction, re-rendering the same instance can't
    // change it.
    const mode = this.isView ? "edit" : "view";
    const replacement = new this.constructor({ document: this.document, mode });
    transferAmbianceSound(this, replacement);
    await this.close();
    replacement.render(true);
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
