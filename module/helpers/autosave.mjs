// Sheet instance -> {name, start, end} of the field mid-edit when its
// autosave fired. A save updates the document, which re-renders the sheet
// and replaces that field with a brand new element showing the saved
// value - losing focus and resetting the cursor to the start unless we
// explicitly put it back.
const pendingFocus = new WeakMap();

/**
 * Auto-saves on "change" - when a field loses focus after being edited, or
 * a native picker (the colour swatch, a <select>) is closed/committed -
 * one field (or one whole array) at a time, never the whole form in one
 * call like Foundry's default submitOnChange does. A blanket whole-form
 * resubmit means two people editing different fields on the same document
 * at the same time can silently overwrite each other's work with a stale
 * copy of whatever field they weren't touching; saving only what actually
 * changed avoids that. Deliberately not on "input" (every keystroke) -
 * "change" already fires exactly on "clicked elsewhere" or "menu closed",
 * so there's nothing a timer would add. Call once from a sheet's _onRender.
 *
 * Array-backed fields (system.infos.0.valeur, system.relations.2.nom, ...)
 * can't be saved through their own dotted path alone - Document#update
 * replaces an array wholesale rather than merging into one of its
 * elements, so a change anywhere inside one instead re-sends a whole array.
 *
 * That array is NOT just "whatever FormDataExtended says", even though an
 * earlier version of this did exactly that: it read fine as long as every
 * row of the array always had its fields in the form at once (true for
 * presentation's info list), but broke the moment a sheet only ever shows
 * ONE row at a time (relations' open-one-to-edit-it list) - rebuilding
 * "the array" from a form that only contains row 2's fields produced an
 * array containing only row 2, silently deleting every other row on the
 * very next edit. Instead: start from the document's own current array,
 * and replace only the one row whose field just changed with what the
 * form currently holds for that row - every other row is left exactly as
 * it already was, regardless of whether it happens to be in the form too.
 *
 * That per-row read is itself from FormDataExtended, so EVERY schema field
 * on an array element needs a form input somewhere for that row - including
 * ones nobody types into by hand (e.g. relations' journalUuid, set only
 * from JS on link). Skip one and it's not just uneditable: the very next
 * edit to any sibling field on that same row silently wipes it back to
 * the schema default, since it's simply absent from the row's own data.
 * A <input type="hidden"> covers a field like that.
 */
export function bindIsolatedAutosave(sheet) {
  restorePendingFocus(sheet);

  const form = sheet.form;
  if (!form || form.dataset.uasjAutosave) return;
  form.dataset.uasjAutosave = "1";

  form.addEventListener("change", event => {
    const field = event.target;
    if (!field.name) return;
    rememberFocus(sheet, field);

    const arrayMatch = field.name.match(/^(system\.\w+)\.(\d+)\./);
    if (arrayMatch) {
      const [, arrayPath, indexStr] = arrayMatch;
      const index = Number(indexStr);
      const key = arrayPath.replace(/^system\./, "");

      const array = foundry.utils.deepClone(
        foundry.utils.getProperty(sheet.document.system.toObject(), key) ?? []
      );
      // FormDataExtended#object is flat (keyed by each field's literal
      // dotted name) - expand it before pulling this one row back out.
      const data = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(form).object);
      const rowData = foundry.utils.getProperty(data, `${arrayPath}.${index}`);
      if (rowData && index in array) array[index] = rowData;

      sheet.document.update({ [arrayPath]: array });
      return;
    }

    sheet.document.update({ [field.name]: fieldValue(field) });
  });
}

function rememberFocus(sheet, field) {
  if (document.activeElement !== field) return;
  if (typeof field.selectionStart !== "number") return;
  pendingFocus.set(sheet, { name: field.name, start: field.selectionStart, end: field.selectionEnd });
}

function restorePendingFocus(sheet) {
  const target = pendingFocus.get(sheet);
  if (!target) return;
  pendingFocus.delete(sheet);

  const field = Array.from(sheet.form?.elements ?? []).find(el => el.name === target.name);
  if (!field) return;
  field.focus();
  if (typeof field.setSelectionRange === "function") {
    try {
      field.setSelectionRange(target.start, target.end);
    } catch {
      // Some input types (e.g. color, number) don't support text selection.
    }
  }
}

function fieldValue(field) {
  if (field.type === "checkbox") return field.checked;
  if ((field.tagName === "SELECT") && field.multiple) return Array.from(field.selectedOptions, o => o.value);
  return field.value;
}
