import { ambientSoundSchemaFields } from "../helpers/ambient-sound.mjs";
import { relationSchema } from "./relations-page.mjs";

export class LieuPageModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...ambientSoundSchemaFields(),
      // Per-card colour, picked by the owner - blank means "use the
      // default look", not "invalid". Same field as Présentation's own
      // couleurFond (data/presentation-page.mjs).
      couleurFond: new fields.ColorField({ required: false, label: "UASJ.Apparence.CouleurFond" }),
      description: new fields.HTMLField({
        required: false,
        blank: true,
        initial: "",
        label: "UASJ.Lieu.Description"
      }),
      // Same "post-it" chip system as Présentation (helpers/info-chips-manager.mjs).
      infosVerrouillees: new fields.BooleanField({
        required: false,
        initial: false,
        label: "UASJ.Infos.Verrouiller"
      }),
      infos: new fields.ArrayField(new fields.SchemaField({
        id: new fields.StringField({ required: true, blank: false }),
        valeur: new fields.StringField({ required: false, blank: true, initial: "" }),
        x: new fields.NumberField({ required: false, initial: 5, min: 0, max: 100 }),
        y: new fields.NumberField({ required: false, initial: 5, min: 0, max: 100 })
      })),
      // Same shape as the standalone Relations page (data/relations-page.mjs)
      // - links to any other journal (personnage, lieu, ou générique),
      // not just other lieux.
      relations: new fields.ArrayField(relationSchema())
    };
  }
}
