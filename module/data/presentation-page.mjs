import { ambientSoundSchemaFields } from "../helpers/ambient-sound.mjs";

export class PresentationPageModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...ambientSoundSchemaFields(),
      role: new fields.StringField({
        required: false,
        blank: true,
        initial: "",
        label: "UASJ.Presentation.Role"
      }),
      // Per-card colour, picked by the owner rather than guessed from the
      // portrait - blank means "use the default look", not "invalid".
      couleurFond: new fields.ColorField({ required: false, label: "UASJ.Apparence.CouleurFond" }),
      couleurTexte: new fields.ColorField({ required: false, label: "UASJ.Apparence.CouleurTexte" }),
      // Blank = couleur unie (couleurFond ci-dessus) ; sinon l'id d'une
      // entrée de TEXTURE_CATALOG qui prend le pas sur couleurFond.
      texture: new fields.StringField({
        required: false,
        blank: true,
        initial: "",
        label: "UASJ.Apparence.Texture"
      }),
      description: new fields.HTMLField({
        required: false,
        blank: true,
        initial: "",
        label: "UASJ.Presentation.Description"
      }),
      // Owner-only safeguard against dragging an info chip by accident
      // while just reading the card - does not affect editing the chips'
      // values/selection, only the free-drag repositioning in view mode.
      infosVerrouillees: new fields.BooleanField({
        required: false,
        initial: false,
        label: "UASJ.Infos.Verrouiller"
      }),
      infos: new fields.ArrayField(new fields.SchemaField({
        id: new fields.StringField({ required: true, blank: false }),
        valeur: new fields.StringField({ required: false, blank: true, initial: "" }),
        // Free position within the infos canvas, as a percentage of its
        // width/height rather than a pixel offset - stays put relative to
        // the card if the window gets resized, instead of drifting off the
        // edge or piling up in a corner.
        x: new fields.NumberField({ required: false, initial: 5, min: 0, max: 100 }),
        y: new fields.NumberField({ required: false, initial: 5, min: 0, max: 100 })
      }))
    };
  }
}
