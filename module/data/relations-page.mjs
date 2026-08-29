import { ambientSoundSchemaFields } from "../helpers/ambient-sound.mjs";

/**
 * A single relation entry. Deliberately independent of any relation the
 * other side might keep in their own list - no shared/paired object, no
 * forced symmetry, since one-sided awareness (or a distorted private view)
 * is normal, not a data integrity problem to prevent. Exported so any
 * other page model with its own "relations" array (e.g. a Lieu's) can
 * reuse the exact same shape instead of redefining it.
 */
export function relationSchema() {
  const fields = foundry.data.fields;
  return new fields.SchemaField({
    img: new fields.StringField({ required: false, blank: true, initial: "" }),
    nom: new fields.StringField({ required: false, blank: true, initial: "" }),
    titre: new fields.StringField({ required: false, blank: true, initial: "" }),
    // Set only when linked via drag-drop/search (see #applyEntryToRelation
    // in the sheet) - lets the view side jump straight to that character's
    // own journal. Blank for a relation to someone with no journal entry
    // of their own; not cleared if img/nom are edited by hand afterwards.
    journalUuid: new fields.StringField({ required: false, blank: true, initial: "" }),
    textePublic: new fields.HTMLField({ required: false, blank: true, initial: "" }),
    texteIntime: new fields.HTMLField({ required: false, blank: true, initial: "" }),
    intimeVisibleA: new fields.SetField(new fields.StringField())
  });
}

export class RelationsPageModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...ambientSoundSchemaFields(),
      relations: new fields.ArrayField(relationSchema())
    };
  }
}
