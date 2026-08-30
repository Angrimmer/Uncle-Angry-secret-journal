/**
 * Catalogue fixe des informations courtes proposables sur une carte de
 * présentation. Le propriétaire de chaque carte choisit lesquelles il
 * affiche - ce n'est pas une décision unique imposée par le MJ à toutes les
 * cartes, chacune reste indépendante.
 *
 * "choices" est optionnel : présent, la valeur se choisit dans une liste
 * déroulante (utile pour un champ à vocabulaire fermé, comme l'alignement) ;
 * absent, c'est un texte libre.
 */
export function choiceList(values) {
  return Object.fromEntries(values.map(value => [value, value]));
}

export const ALIGNEMENTS = choiceList([
  "Loyal bon", "Neutre bon", "Chaotique bon",
  "Loyal neutre", "Neutre", "Chaotique neutre",
  "Loyal mauvais", "Neutre mauvais", "Chaotique mauvais"
]);

const GENRES = choiceList(["Masculin", "Féminin", "Autre", "Non précisé"]);

const PRONOMS = choiceList(["Il", "Elle", "Iel", "Autre"]);

// Distinct from "statut" (a narrative/social position, e.g. "Héritière du
// monde démoniaque") - this is literally alive/dead/etc., a separate axis
// that can coexist with it rather than replace it.
const ETATS_VITAUX = choiceList(["Vivant", "Mort", "Mort-vivant", "Disparu", "Inconnu"]);

export const INFO_CATALOG = [
  { id: "age", label: "UASJ.Infos.Age" },
  { id: "espece", label: "UASJ.Infos.Espece" },
  { id: "statut", label: "UASJ.Infos.Statut" },
  { id: "etatVital", label: "UASJ.Infos.EtatVital", choices: ETATS_VITAUX },
  { id: "faction", label: "UASJ.Infos.Faction" },
  { id: "taille", label: "UASJ.Infos.Taille" },
  { id: "poids", label: "UASJ.Infos.Poids" },
  { id: "alignement", label: "UASJ.Infos.Alignement", choices: ALIGNEMENTS },
  { id: "metier", label: "UASJ.Infos.Metier" },
  { id: "origine", label: "UASJ.Infos.Origine" },
  { id: "genre", label: "UASJ.Infos.Genre", choices: GENRES },
  { id: "pronom", label: "UASJ.Infos.Pronom", choices: PRONOMS },
  { id: "divinite", label: "UASJ.Infos.Divinite" },
  { id: "langues", label: "UASJ.Infos.Langues" },
  { id: "yeux", label: "UASJ.Infos.Yeux" },
  { id: "cheveux", label: "UASJ.Infos.Cheveux" },
  { id: "peau", label: "UASJ.Infos.Peau" },
  { id: "voix", label: "UASJ.Infos.Voix" },
  { id: "surnoms", label: "UASJ.Infos.Surnoms" },
  { id: "traits", label: "UASJ.Infos.Traits" },
  { id: "ideaux", label: "UASJ.Infos.Ideaux" },
  { id: "liens", label: "UASJ.Infos.Liens" },
  { id: "defauts", label: "UASJ.Infos.Defauts" },
  { id: "localisation", label: "UASJ.Infos.Localisation" },
  { id: "ascendance", label: "UASJ.Infos.Ascendance" },
  { id: "presence", label: "UASJ.Infos.Presence" }
];

export function getInfoDefinition(id) {
  return INFO_CATALOG.find(info => info.id === id) ?? null;
}
