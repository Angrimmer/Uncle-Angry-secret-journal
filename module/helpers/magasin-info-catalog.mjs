import { choiceList } from "./info-catalog.mjs";

const REPUTATIONS = choiceList(["Excellente", "Bonne", "Correcte", "Douteuse", "Infâme"]);
// Monk's own Shop sheet tracks an explicit open/closed state alongside its
// hours of operation - worth keeping as its own chip rather than folding
// into "Horaires" (texte libre), since it's the one thing a player usually
// wants to know at a glance.
const ETATS = choiceList(["Ouvert", "Fermé"]);
// Not in Monk's shop-attributes (it doesn't have a dedicated list the way
// person/place do) - added since a "secret journal" module is a natural
// fit for restricted-access shops (black market, invitation only).
const ACCES = choiceList(["Public", "Sur invitation", "Marché noir"]);

/**
 * Catalogue de chips pour une carte Magasin - même système que
 * Présentation/Lieu (helpers/info-chips-manager.mjs), catalogue différent.
 */
export const MAGASIN_INFO_CATALOG = [
  { id: "typeCommerce", label: "UASJ.Magasin.TypeCommerce" },
  { id: "specialite", label: "UASJ.Magasin.Specialite" },
  { id: "etat", label: "UASJ.Magasin.Etat", choices: ETATS },
  { id: "horaires", label: "UASJ.Magasin.Horaires" },
  { id: "acces", label: "UASJ.Magasin.Acces", choices: ACCES },
  { id: "emplacement", label: "UASJ.Magasin.Emplacement" },
  { id: "reputation", label: "UASJ.Magasin.Reputation", choices: REPUTATIONS },
  // Faction/Taille reprennent les mêmes libellés que le catalogue
  // Présentation (helpers/info-catalog.mjs) - même concept, inutile de le
  // redéfinir.
  { id: "faction", label: "UASJ.Infos.Faction" },
  { id: "taille", label: "UASJ.Infos.Taille" }
];

export function getMagasinInfoDefinition(id) {
  return MAGASIN_INFO_CATALOG.find(info => info.id === id) ?? null;
}
