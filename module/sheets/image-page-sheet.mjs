import { MODULE_ID } from "../helpers/constants.mjs";
import { bindIsolatedAutosave } from "../helpers/autosave.mjs";
import { showImagePopout } from "../helpers/image-popout.mjs";

const { JournalEntryPageHandlebarsSheet } = foundry.applications.sheets.journal;

/**
 * An "Image" card: the single-image sibling of Galerie - opening it shows
 * just the one image directly, no grid, no list to manage. Built on
 * page.name/page.src (native JournalEntryPage fields, see data/image-page.mjs)
 * rather than any system.* field. Clicking the image still goes through
 * showImagePopout like every other card's image, for the same free native
 * one-click share Alex asked for on Galerie.
 */
export class ImagePageSheet extends JournalEntryPageHandlebarsSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["uasj-image"],
    position: {
      width: 640,
      height: 640
    },
    // Replaced by our own per-field autosave (see helpers/autosave.mjs).
    form: {
      submitOnChange: false
    },
    window: {
      icon: "fa-solid fa-image"
    },
    actions: {
      uasjToggleMode: ImagePageSheet.#onToggleMode,
      uasjAgrandirImage: ImagePageSheet.#onAgrandirImage,
      uasjMontrerJoueurs: ImagePageSheet.#onMontrerJoueurs
    }
  };

  /**
   * No header/footer part - same reasoning as the other card sheets.
   * @override
   */
  static EDIT_PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/pages/image/edit.hbs`,
      classes: ["standard-form"],
      scrollable: [""]
    }
  };

  /** @override */
  static VIEW_PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/pages/image/view.hbs`,
      root: true,
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */

  /**
   * Montrer aux joueurs / basculer voir-modifier - always visible in the
   * title bar rather than tucked in the "..." dropdown, owner-only, same
   * pattern as every other card sheet. This one shows the whole page via
   * Foundry's native ShowToPlayersDialog (picking specific players) -
   * distinct from clicking the image itself, which broadcasts to everyone
   * via ImagePopout's own native share button (see #onAgrandirImage).
   * @override
   */
  _getFrameButtons(options) {
    const buttons = super._getFrameButtons(options);
    if (!this.page.isOwner) return buttons;
    buttons.unshift(
      { action: "uasjMontrerJoueurs", icon: "fa-solid fa-eye", label: "UASJ.Toggle.MontrerJoueurs" },
      {
        action: "uasjToggleMode",
        icon: this.isView ? "fa-solid fa-pen" : "fa-solid fa-address-card",
        label: this.isView ? "UASJ.Mode.Modifier" : "UASJ.Mode.Voir"
      }
    );
    return buttons;
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    bindIsolatedAutosave(this);
  }

  /** @inheritDoc */
  async _prepareContentContext(context, options) {
    context.name = this.page.name;
    context.src = this.page.src;
    context.srcInput = this.#createSourceInput.bind(this);
  }

  /**
   * Create a FilePicker input for the src field.
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
    // this.render({mode: ...}) does nothing - an ApplicationV2's options,
    // mode included, are frozen at construction (see helpers/open-page.mjs
    // for the full reasoning), so switching mode means a fresh instance.
    const mode = this.isView ? "edit" : "view";
    const replacement = new this.constructor({ document: this.document, mode });
    await this.close();
    replacement.render(true);
  }

  static #onAgrandirImage() {
    showImagePopout(this.page.src, this.page.name);
  }

  static #onMontrerJoueurs() {
    return foundry.documents.collections.Journal.showDialog(this.page, { parent: this });
  }
}
