import { MODULE_ID } from "./constants.mjs";

/**
 * Textures de fond proposables sur une carte de présentation, en plus de la
 * couleur unie - une image fournie par l'utilisateur du module, déposée
 * dans assets/textures/.
 */
export const TEXTURE_CATALOG = [
  {
    id: "parchemin2",
    label: "UASJ.Apparence.TextureParchemin2",
    image: `modules/${MODULE_ID}/assets/textures/parchemin2.jpg`
  }
];

export function getTextureDefinition(id) {
  return TEXTURE_CATALOG.find(entry => entry.id === id) ?? null;
}
