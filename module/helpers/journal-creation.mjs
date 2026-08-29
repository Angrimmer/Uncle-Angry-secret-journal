import { MODULE_ID } from "./constants.mjs";
import { JOURNAL_KINDS, getJournalKind } from "./journal-kinds.mjs";
import { openPageInMode } from "./open-page.mjs";

const FLAG_KIND = "kind";

/**
 * Wraps a static method. Prefers libWrapper when it's active, so other
 * modules wrapping the same method stay compatible; falls back to a plain
 * reassignment otherwise, since libWrapper is a soft dependency, not a hard
 * one.
 */
function wrapStatic(cls, methodName, wrapper) {
  if (game.modules.get("lib-wrapper")?.active) {
    libWrapper.register(MODULE_ID, `${cls.name}.${methodName}`, wrapper, "WRAPPER");
    return;
  }
  const original = cls[methodName];
  cls[methodName] = function (...args) {
    return wrapper.call(this, original.bind(this), ...args);
  };
}

/**
 * Adds a "kind" picker to JournalEntry's native creation dialog. Picking a
 * kind creates the entry with its starter page(s) embedded directly in the
 * same creation call (rather than adding them afterwards) specifically so
 * there's no gap where the entry exists without its pages yet - and then
 * opens the right sheet immediately: the primary page's own card for a
 * "card" kind, or the entry itself otherwise, matching vanilla behaviour.
 */
export function registerJournalCreationFlow() {
  wrapStatic(JournalEntry, "createDialog", function (wrapped, data, createOptions, dialogOptions, renderOptions) {
    dialogOptions = { ...dialogOptions, [MODULE_ID]: createOptions };
    return wrapped(data, createOptions, dialogOptions, renderOptions);
  });

  Hooks.on("renderDialogV2", (dialog, html) => {
    const createOptions = dialog.options[MODULE_ID];
    if (createOptions) attachKindPicker(dialog, html, createOptions);
  });
}

/* -------------------------------------------- */

function attachKindPicker(dialog, html, createOptions) {
  insertKindPicker(html);

  const okButton = dialog.options.buttons?.ok;
  if (okButton) okButton.callback = (event, button) => onConfirmCreate(button, createOptions);
}

async function onConfirmCreate(button, { parent, pack } = {}) {
  // FormDataExtended#object is flat (keyed by each field's literal dotted
  // name, e.g. "flags.uncle-angry-secret-journal.kind") - it does not nest
  // it into a real object the way Document#update does internally. Expand
  // it ourselves so setProperty below adds to the same real data.flags
  // object instead of a second, unrelated one.
  const data = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(button.form).object);
  if (!data.folder) delete data.folder;
  if (!data.name?.trim()) data.name = JournalEntry.defaultName({ parent, pack });

  const kind = getJournalKind(foundry.utils.getProperty(data, `flags.${MODULE_ID}.${FLAG_KIND}`));
  if (kind) {
    data.pages = kind.pageTypes.map(type => ({ name: data.name, type }));
    if (kind.cardSheet) foundry.utils.setProperty(data, "flags.core.sheetClass", `${MODULE_ID}.CardEntrySheet`);
  }

  const doc = await JournalEntry.create(data, { renderSheet: false, parent, pack });
  // Foundry already reports the validation error itself (console + UI
  // notification) and resolves undefined rather than throwing - nothing
  // more to do here than stop before touching a document that was never
  // created.
  if (!doc) return;

  const primaryPage = kind ? doc.pages.find(page => page.type === kind.pageTypes[0]) : null;
  if (primaryPage) openPageInMode(primaryPage, "view");
  else doc.sheet.render(true);

  return doc;
}

function insertKindPicker(html) {
  const nameGroup = html.querySelector('[name="name"]')?.closest(".form-group");
  if (!nameGroup) return;

  const select = document.createElement("select");
  select.name = `flags.${MODULE_ID}.${FLAG_KIND}`;
  select.append(buildOption("", game.i18n.localize("UASJ.Kinds.None")));
  for (const kind of JOURNAL_KINDS) {
    select.append(buildOption(kind.id, game.i18n.localize(kind.label)));
  }

  const fields = document.createElement("div");
  fields.className = "form-fields";
  fields.append(select);

  const label = document.createElement("label");
  label.textContent = game.i18n.localize("UASJ.Kinds.Label");

  const group = document.createElement("div");
  group.className = "form-group";
  group.append(label, fields);

  nameGroup.after(group);
}

function buildOption(value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  return option;
}
