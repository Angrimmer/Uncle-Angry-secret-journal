import { ambientSoundSchemaFields } from "../helpers/ambient-sound.mjs";
import { relationSchema } from "./relations-page.mjs";

/**
 * A single offering entry. Always linked to a real Item (itemUuid) - unlike
 * a relation, there's no "manual entry, no link" state to support, since
 * offerings can only ever be created by dropping/searching a real Item (see
 * helpers/offerings-manager.mjs). img/nom are the same kind of fallback
 * snapshot as relationSchema's - the actual displayed values are re-resolved
 * live from the Item every render (withLiveOfferingIdentity), these only
 * matter if the link ever breaks. prix/quantite are deliberately free text,
 * not numbers: they belong to this specific shop's listing, not to the Item
 * itself (the same sword can cost differently at different shops) - Mon
 * Système's own Items don't even have a price/quantity field to read from.
 */
export function offeringSchema() {
  const fields = foundry.data.fields;
  return new fields.SchemaField({
    itemUuid: new fields.StringField({ required: false, blank: true, initial: "" }),
    img: new fields.StringField({ required: false, blank: true, initial: "" }),
    nom: new fields.StringField({ required: false, blank: true, initial: "" }),
    prix: new fields.StringField({ required: false, blank: true, initial: "" }),
    quantite: new fields.StringField({ required: false, blank: true, initial: "" })
  });
}

export class MagasinPageModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...ambientSoundSchemaFields(),
      couleurFond: new fields.ColorField({ required: false, label: "UASJ.Apparence.CouleurFond" }),
      description: new fields.HTMLField({
        required: false,
        blank: true,
        initial: "",
        label: "UASJ.Magasin.Description"
      }),
      // Same "post-it" chip system as Présentation/Lieu (helpers/info-chips-manager.mjs).
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
      offerings: new fields.ArrayField(offeringSchema()),
      // Same shape as the standalone Relations page and Lieu - links to any
      // other journal (personnage, lieu, ou un autre magasin), not just
      // other magasins.
      relations: new fields.ArrayField(relationSchema())
    };
  }
}
