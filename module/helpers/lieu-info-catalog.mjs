import { ALIGNEMENTS } from "./info-catalog.mjs";

/**
 * Catalogue de chips pour une carte Lieu - même système que Présentation
 * (helpers/info-catalog.mjs), catalogue différent. Réutilise le choix
 * "Alignement" déjà défini là-bas plutôt que de le redéfinir.
 */
export const LIEU_INFO_CATALOG = [
  { id: "position", label: "UASJ.Lieu.Position" },
  { id: "type", label: "UASJ.Lieu.Type" },
  { id: "alignement", label: "UASJ.Infos.Alignement", choices: ALIGNEMENTS },
  { id: "population", label: "UASJ.Lieu.Population" },
  { id: "danger", label: "UASJ.Lieu.Danger" },
  { id: "gouvernement", label: "UASJ.Lieu.Gouvernement" },
  // Faction/Taille/Age reprennent tels quels les mêmes libellés que le
  // catalogue Présentation (helpers/info-catalog.mjs) - même concept,
  // catalogue différent, inutile de le redéfinir.
  { id: "faction", label: "UASJ.Infos.Faction" },
  { id: "taille", label: "UASJ.Infos.Taille" },
  { id: "age", label: "UASJ.Infos.Age" },
  { id: "climat", label: "UASJ.Lieu.Climat" },
  { id: "economie", label: "UASJ.Lieu.Economie" }
];

export function getLieuInfoDefinition(id) {
  return LIEU_INFO_CATALOG.find(info => info.id === id) ?? null;
}
