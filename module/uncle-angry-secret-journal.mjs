import { MODULE_ID, MODULE_TITLE } from "./helpers/constants.mjs";
import { PresentationPageModel } from "./data/presentation-page.mjs";
import { PresentationPageSheet } from "./sheets/presentation-page-sheet.mjs";
import { RelationsPageModel } from "./data/relations-page.mjs";
import { RelationsPageSheet } from "./sheets/relations-page-sheet.mjs";
import { LieuPageModel } from "./data/lieu-page.mjs";
import { LieuPageSheet } from "./sheets/lieu-page-sheet.mjs";
import { MagasinPageModel } from "./data/magasin-page.mjs";
import { MagasinPageSheet } from "./sheets/magasin-page-sheet.mjs";
import { GaleriePageModel } from "./data/galerie-page.mjs";
import { GaleriePageSheet } from "./sheets/galerie-page-sheet.mjs";
import { ImagePageModel } from "./data/image-page.mjs";
import { ImagePageSheet } from "./sheets/image-page-sheet.mjs";
import { CardEntrySheet } from "./sheets/card-entry-sheet.mjs";
import { registerJournalCreationFlow } from "./helpers/journal-creation.mjs";

Hooks.once("init", () => {
  console.log(`${MODULE_TITLE} | Initialisation`);

  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    [`${MODULE_ID}.presentation`]: PresentationPageModel,
    [`${MODULE_ID}.relations`]: RelationsPageModel,
    [`${MODULE_ID}.lieu`]: LieuPageModel,
    [`${MODULE_ID}.magasin`]: MagasinPageModel,
    [`${MODULE_ID}.galerie`]: GaleriePageModel,
    // Not just "image" - that collides with JournalEntryPage's own
    // reserved core type name (metadata.coreTypes: ["text", "image",
    // "pdf", "video"]) and silently breaks the WHOLE module's
    // documentTypes registration in module.json, not just this one type
    // (AdditionalTypesField#_validateType validates the whole block and
    // throws on the first reserved-name collision it finds).
    [`${MODULE_ID}.imageseule`]: ImagePageModel
  });

  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, MODULE_ID, PresentationPageSheet, {
    types: [`${MODULE_ID}.presentation`],
    makeDefault: true,
    label: `TYPES.JournalEntryPage.${MODULE_ID}.presentation`
  });

  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, MODULE_ID, RelationsPageSheet, {
    types: [`${MODULE_ID}.relations`],
    makeDefault: true,
    label: `TYPES.JournalEntryPage.${MODULE_ID}.relations`
  });

  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, MODULE_ID, LieuPageSheet, {
    types: [`${MODULE_ID}.lieu`],
    makeDefault: true,
    label: `TYPES.JournalEntryPage.${MODULE_ID}.lieu`
  });

  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, MODULE_ID, MagasinPageSheet, {
    types: [`${MODULE_ID}.magasin`],
    makeDefault: true,
    label: `TYPES.JournalEntryPage.${MODULE_ID}.magasin`
  });

  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, MODULE_ID, GaleriePageSheet, {
    types: [`${MODULE_ID}.galerie`],
    makeDefault: true,
    label: `TYPES.JournalEntryPage.${MODULE_ID}.galerie`
  });

  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, MODULE_ID, ImagePageSheet, {
    types: [`${MODULE_ID}.imageseule`],
    makeDefault: true,
    label: `TYPES.JournalEntryPage.${MODULE_ID}.imageseule`
  });

  // Never the default/fallback for an ordinary JournalEntry - only entries
  // created through our own kind picker get pinned to it, via
  // flags.core.sheetClass (see journal-creation.mjs).
  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntry, MODULE_ID, CardEntrySheet, {
    label: "UASJ.Sheets.Carte",
    makeDefault: false,
    canBeDefault: false
  });

  registerJournalCreationFlow();

  return loadTemplates([
    `modules/${MODULE_ID}/templates/pages/presentation/edit.hbs`,
    `modules/${MODULE_ID}/templates/pages/presentation/view.hbs`,
    `modules/${MODULE_ID}/templates/pages/relations/edit.hbs`,
    `modules/${MODULE_ID}/templates/pages/relations/view.hbs`,
    `modules/${MODULE_ID}/templates/pages/lieu/edit.hbs`,
    `modules/${MODULE_ID}/templates/pages/lieu/view.hbs`,
    `modules/${MODULE_ID}/templates/pages/magasin/edit.hbs`,
    `modules/${MODULE_ID}/templates/pages/magasin/view.hbs`,
    `modules/${MODULE_ID}/templates/pages/galerie/edit.hbs`,
    `modules/${MODULE_ID}/templates/pages/galerie/view.hbs`,
    `modules/${MODULE_ID}/templates/pages/image/edit.hbs`,
    `modules/${MODULE_ID}/templates/pages/image/view.hbs`,
    `modules/${MODULE_ID}/templates/partials/relations-panel-edit.hbs`,
    `modules/${MODULE_ID}/templates/partials/relations-panel-view.hbs`,
    `modules/${MODULE_ID}/templates/partials/offerings-panel-edit.hbs`,
    `modules/${MODULE_ID}/templates/partials/offerings-panel-view.hbs`,
    `modules/${MODULE_ID}/templates/dialogs/choose-infos.hbs`,
    `modules/${MODULE_ID}/templates/dialogs/choose-ambiance.hbs`
  ]);
});
