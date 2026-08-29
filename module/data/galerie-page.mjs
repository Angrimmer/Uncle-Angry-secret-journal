/**
 * A "Galerie" page: an ordered list of images, each with its own short
 * label. Deliberately minimal (Alex's explicit call) - no ambiance, no
 * background colour, no relations, no tabs - just a more practical
 * alternative to Foundry's native single-image journal page. Whether it
 * reads as "one image" or "a gallery" is purely a function of how many
 * entries this array has - no separate mode to pick, the grid just shows
 * whatever's there.
 */
export class GaleriePageModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      images: new fields.ArrayField(new fields.SchemaField({
        img: new fields.StringField({ required: false, blank: true, initial: "" }),
        nom: new fields.StringField({ required: false, blank: true, initial: "" })
      }))
    };
  }
}
