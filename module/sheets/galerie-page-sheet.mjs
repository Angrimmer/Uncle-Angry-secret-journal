import { MODULE_ID } from "../helpers/constants.mjs";
import { bindIsolatedAutosave } from "../helpers/autosave.mjs";
import { bindTruncateHover, clearTruncateHover } from "../helpers/truncate-hover.mjs";
import { showImagePopout } from "../helpers/image-popout.mjs";

const { JournalEntryPageHandlebarsSheet } = foundry.applications.sheets.journal;

/**
 * A "Galerie" card: a single/multi image viewer, more practical than
 * Foundry's native image journal page - deliberately minimal (Alex's
 * explicit call), no capability mixins needed since there's nothing here
 * to share with the other card kinds. Clicking a thumbnail enlarges it via
 * the same showImagePopout helper every other card uses, which already
 * carries Foundry's own native "Show Image" header button (GM-only,
 * broadcasts to every connected player) - the one-click share Alex asked
 * for comes for free from that, nothing custom to build.
 */
export class GaleriePageSheet extends JournalEntryPageHandlebarsSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["uasj-galerie"],
    position: {
      width: 720,
      height: 640
    },
    // Replaced by our own per-field autosave (see helpers/autosave.mjs).
    form: {
      submitOnChange: false
    },
    window: {
      icon: "fa-solid fa-images"
    },
    actions: {
      uasjToggleMode: GaleriePageSheet.#onToggleMode,
      uasjAjouterImage: GaleriePageSheet.#onAjouterImage,
      uasjSupprimerImage: GaleriePageSheet.#onSupprimerImage,
      uasjAgrandirImage: GaleriePageSheet.#onAgrandirImage,
      uasjMontrerJoueurs: GaleriePageSheet.#onMontrerJoueurs
    }
  };

  /**
   * No header/footer part - same reasoning as the other card sheets.
   * @override
   */
  static EDIT_PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/pages/galerie/edit.hbs`,
      classes: ["standard-form"],
      scrollable: [""]
    }
  };

  /** @override */
  static VIEW_PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/pages/galerie/view.hbs`,
      root: true,
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */

  /**
   * Montrer aux joueurs / basculer voir-modifier - always visible in the
   * title bar rather than tucked in the "..." dropdown, owner-only, same
   * pattern as every other card sheet. This shows the whole gallery via
   * Foundry's native ShowToPlayersDialog (picking specific players) -
   * distinct from clicking a single thumbnail, which broadcasts just that
   * one image to everyone via ImagePopout's own native share button (see
   * #onAgrandirImage) - same split as ImagePageSheet.
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
    bindTruncateHover(this);
  }

  /** @inheritDoc */
  close(options) {
    clearTruncateHover(this);
    return super.close(options);
  }

  /** @inheritDoc */
  async _prepareContentContext(context, options) {
    context.name = this.page.name;
    context.images = this.page.system.images.map((image, index) => ({ ...image, index }));
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

  static async #onAjouterImage() {
    const images = this.page.system.toObject().images;
    images.push({ img: "", nom: "" });
    await this.page.update({ "system.images": images });
  }

  static async #onSupprimerImage(event, target) {
    const images = this.page.system.toObject().images;
    images.splice(Number(target.dataset.index), 1);
    await this.page.update({ "system.images": images });
  }

  static #onAgrandirImage(event, target) {
    showImagePopout(target.dataset.src, target.dataset.nom);
  }

  static #onMontrerJoueurs() {
    return foundry.documents.collections.Journal.showDialog(this.page, { parent: this });
  }
}
