import { MODULE_ID } from "./constants.mjs";

/**
 * Adds "a catalog of short chips, freely dragged into place on a canvas,
 * lockable so they don't move by accident" to any
 * JournalEntryPageHandlebarsSheet whose data model has an `infos` array
 * shaped like Présentation's (`{id, valeur, x, y}`) and an
 * `infosVerrouillees` boolean. Extracted from PresentationPageSheet so
 * Lieu (and future kinds) get the exact same system rather than a
 * reimplementation - per Alex: "autant garder le système qu'on a fait et
 * qui est fonctionnel".
 *
 * The host class must declare `static INFO_CATALOG = [...]` (see
 * helpers/info-catalog.mjs / helpers/lieu-info-catalog.mjs for the shape)
 * - read via `this.constructor.INFO_CATALOG` so each host can have its own
 * catalog while sharing this exact same behavior.
 *
 * Same reasoning as relations-manager.mjs for why the action handlers
 * below are plain (non-#private) statics: a subclass's own
 * DEFAULT_OPTIONS.actions needs to reference them by name, which a
 * #private method declared in this mixin's class body wouldn't allow.
 */
/**
 * Updates (or removes) the "lock the info chips in place" header control -
 * shared by every sheet using InfoChipsCapabilityMixin, since the icon/
 * label toggling logic is identical regardless of which host it's on.
 * Call from a sheet's own _getHeaderControls().
 */
export function applyInfoLockControlLabel(controls, sheet) {
  const lock = controls.find(c => c.action === "uasjVerrouillerInfos");
  if (!lock) return;

  if (!sheet.isView) {
    // Only the view-mode free-drag layout can be locked - meaningless
    // while editing, where chips are edited by field, not dragged.
    controls.splice(controls.indexOf(lock), 1);
    return;
  }

  const locked = !!sheet.page.system.infosVerrouillees;
  lock.icon = locked ? "fa-solid fa-lock" : "fa-solid fa-lock-open";
  lock.label = locked ? "UASJ.Infos.Deverrouiller" : "UASJ.Infos.Verrouiller";
}

export const InfoChipsCapabilityMixin = Base => class extends Base {
  /**
   * Pairs each stored info entry with its catalog label, so the templates
   * never need to know about the catalog themselves.
   */
  _resolveInfos() {
    return this.page.system.infos.map(info => {
      const definition = this.constructor.INFO_CATALOG.find(entry => entry.id === info.id);
      return {
        id: info.id,
        valeur: info.valeur,
        x: info.x,
        y: info.y,
        label: definition?.label ?? info.id,
        choices: definition?.choices ?? null
      };
    });
  }

  /**
   * Lets the card's owner drag each info chip anywhere on the canvas - a
   * free "post-it" layout, not a reorderable list. Only meaningful in view
   * mode, and only for the owner; anyone else just sees whatever
   * arrangement the owner last left it in. Call from a sheet's _onRender,
   * in view mode only.
   */
  _bindInfoDragging() {
    if (!this.page.isOwner) return;
    if (this.page.system.infosVerrouillees) return;
    const canvas = this.element.querySelector(".uasj-infos-canvas");
    if (!canvas) return;

    for (const chip of canvas.querySelectorAll(".uasj-info-chip")) {
      chip.addEventListener("pointerdown", event => this._onChipDragStart(event, chip, canvas));
    }
  }

  _onChipDragStart(event, chip, canvas) {
    if (event.button !== 0) return;
    event.preventDefault();
    chip.setPointerCapture(event.pointerId);
    chip.classList.add("uasj-dragging");

    const onMove = moveEvent => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((moveEvent.clientY - rect.top) / rect.height) * 100));
      chip.style.left = `${x}%`;
      chip.style.top = `${y}%`;
      chip.dataset.pendingX = x;
      chip.dataset.pendingY = y;
    };

    const onUp = async () => {
      chip.removeEventListener("pointermove", onMove);
      chip.removeEventListener("pointerup", onUp);
      chip.classList.remove("uasj-dragging");

      const x = Number(chip.dataset.pendingX);
      const y = Number(chip.dataset.pendingY);
      if (Number.isNaN(x) || Number.isNaN(y)) return;

      const infos = this.page.system.toObject().infos;
      const entry = infos.find(info => info.id === chip.dataset.infoId);
      if (!entry) return;
      entry.x = x;
      entry.y = y;
      await this.page.update({ "system.infos": infos });
    };

    chip.addEventListener("pointermove", onMove);
    chip.addEventListener("pointerup", onUp);
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /**
   * Lets the card's owner pick which catalog infos are active on this
   * specific card - a per-card choice, not a world-wide MJ decision, so
   * every card can highlight what actually reflects it.
   */
  static async onConfigurerInfos() {
    const active = new Set(this.page.system.infos.map(info => info.id));
    const catalog = this.constructor.INFO_CATALOG.map(info => ({ ...info, checked: active.has(info.id) }));
    const content = await renderTemplate(`modules/${MODULE_ID}/templates/dialogs/choose-infos.hbs`, { catalog });

    const chosen = await foundry.applications.api.DialogV2.prompt({
      window: { title: "UASJ.Infos.ConfigurerTitre" },
      content,
      ok: {
        label: "UASJ.Infos.Valider",
        callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
      }
    });
    if (!chosen) return;

    // Existing entries keep their value and the position their owner
    // dragged them to; only a newly-activated info needs a starting spot,
    // staggered so several added at once don't land in the same corner.
    const previous = new Map(this.page.system.infos.map(info => [info.id, info]));
    let freshCount = 0;
    const infos = this.constructor.INFO_CATALOG
      .filter(info => chosen[info.id])
      .map(info => {
        const existing = previous.get(info.id);
        if (existing) return { id: info.id, valeur: existing.valeur, x: existing.x, y: existing.y };
        const offset = (freshCount++) * 8;
        return { id: info.id, valeur: "", x: 5 + offset, y: 5 + offset };
      });

    await this.page.update({ "system.infos": infos });
  }

  static async onVerrouillerInfos() {
    await this.page.update({ "system.infosVerrouillees": !this.page.system.infosVerrouillees });
  }
};
