import { MODULE_ID } from "../helpers/constants.mjs";
import { MAGASIN_INFO_CATALOG } from "../helpers/magasin-info-catalog.mjs";
import { bindIsolatedAutosave } from "../helpers/autosave.mjs";
import { bindTruncateHover, clearTruncateHover } from "../helpers/truncate-hover.mjs";
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
import { RelationsCapabilityMixin } from "../helpers/relations-manager.mjs";
import { OfferingsCapabilityMixin } from "../helpers/offerings-manager.mjs";

const { JournalEntryPageHandlebarsSheet } = foundry.applications.sheets.journal;

/**
 * A "Magasin" card: same single-page-with-tabs structure as Lieu, plus a
 * third tab (Marchandises) backed by OfferingsCapabilityMixin - the shop's
 * list of items for sale, each linked to a real Item document rather than
 * free text (see helpers/offerings-manager.mjs for why).
 */
export class MagasinPageSheet extends InfoChipsCapabilityMixin(OfferingsCapabilityMixin(RelationsCapabilityMixin(JournalEntryPageHandlebarsSheet))) {
  /** Catalog read by InfoChipsCapabilityMixin (helpers/info-chips-manager.mjs). */
  static INFO_CATALOG = MAGASIN_INFO_CATALOG;

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "description", icon: "fa-solid fa-book", label: "UASJ.Magasin.TabDescription" },
        { id: "offerings", icon: "fa-solid fa-coins", label: "UASJ.Magasin.TabOfferings" },
        { id: "relations", icon: "fa-solid fa-people-arrows", label: "UASJ.Magasin.TabRelations" }
      ],
      initial: "description"
    }
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["uasj-magasin"],
    position: {
      width: 640,
      height: 640
    },
    // Replaced by our own per-field autosave (see helpers/autosave.mjs).
    form: {
      submitOnChange: false
    },
    window: {
      icon: "fa-solid fa-store",
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
      uasjConfigurerInfos: MagasinPageSheet.onConfigurerInfos,
      uasjVerrouillerInfos: MagasinPageSheet.onVerrouillerInfos,
      uasjOuvrirRelation: MagasinPageSheet.onOuvrirRelation,
      uasjValiderRelation: MagasinPageSheet.onValiderRelation,
      uasjSupprimerRelation: MagasinPageSheet.onSupprimerRelation,
      uasjAgrandirPortrait: MagasinPageSheet.onAgrandirPortrait,
      uasjVoirJournal: MagasinPageSheet.onVoirJournal,
      uasjOuvrirOffering: MagasinPageSheet.onOuvrirOffering,
      uasjValiderOffering: MagasinPageSheet.onValiderOffering,
      uasjSupprimerOffering: MagasinPageSheet.onSupprimerOffering,
      uasjAgrandirIconeOffering: MagasinPageSheet.onAgrandirIconeOffering,
      uasjVoirItem: MagasinPageSheet.onVoirItem,
      uasjToggleMode: MagasinPageSheet.#onToggleMode,
      uasjAgrandirIcone: MagasinPageSheet.#onAgrandirIcone,
      uasjClicSon: { handler: MagasinPageSheet.#onClicSon, buttons: [0, 2] },
      uasjMontrerJoueurs: MagasinPageSheet.#onMontrerJoueurs
    }
  };

  /**
   * No header/footer part - same reasoning as the other card sheets. A
   * single root part whose template contains the tab nav and every tab's
   * content together - simpler than juggling several PARTS just to get one
   * tab group.
   * @override
   */
  static EDIT_PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/pages/magasin/edit.hbs`,
      classes: ["standard-form"],
      scrollable: [""]
    }
  };

  /** @override */
  static VIEW_PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/pages/magasin/view.hbs`,
      root: true,
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */

  /** @override */
  _getHeaderControls() {
    const controls = super._getHeaderControls();
    applyInfoLockControlLabel(controls, this);
    return controls;
  }

  /**
   * Montrer aux joueurs / couper-lancer l'ambiance sonore / basculer
   * voir-modifier - always visible in the title bar rather than tucked in
   * the "..." dropdown. The ambiance button alone is shown to everyone, not
   * just the owner - so an observer can at least stop the music, even
   * though only the owner can pick which sound plays (right-click, gated
   * inside #onClicSon) - matches ensureAmbianceSound's own "atmosphere for
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
    this._bindOfferingsBehavior();
    if (this.isView) {
      this._bindInfoDragging();
      this.#applyCardAppearance();
    }
  }

  /** @inheritDoc */
  close(options) {
    clearTruncateHover(this);
    stopAmbientSound(this);
    return super.close(options);
  }

  /**
   * Owner-picked background colour - same field/behaviour as
   * LieuPageSheet#applyCardAppearance (see there for why this goes through
   * this.element.style directly rather than a computed inline style in the
   * template: root: true fuses VIEW_PARTS' template root into this.element
   * itself, so a querySelector for it from here would never match).
   */
  #applyCardAppearance() {
    this.element.style.backgroundColor = this.page.system.couleurFond?.css || "";
  }

  /** @inheritDoc */
  async _prepareContentContext(context, options) {
    context.tabs = this._prepareTabs("primary");
    context.name = this.page.name;
    context.src = this.page.src;
    context.srcInput = this.#createSourceInput.bind(this);
    context.infos = this._resolveInfos();

    if (this.isView) {
      context.isOwner = this.page.isOwner;
      context.infosVerrouillees = this.page.system.infosVerrouillees;
      context.description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.page.system.description,
        { relativeTo: this.page, secrets: this.page.isOwner }
      );
      await this._prepareRelationsViewContext(context);
      await this._prepareOfferingsViewContext(context);
    } else {
      await this._prepareRelationsEditContext(context);
      await this._prepareOfferingsEditContext(context);
    }
  }

  /**
   * Create a FilePicker input for the icon/crest source field.
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

  static #onAgrandirIcone() {
    showImagePopout(this.page.src, this.page.name);
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
