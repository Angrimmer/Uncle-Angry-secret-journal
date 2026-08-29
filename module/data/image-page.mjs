/**
 * An "Image" page: the leanest possible card - just Foundry's own native
 * page.name/page.src (the exact same core JournalEntryPage fields every
 * other card's own icon already reuses), no system.* fields needed at all.
 * Split into its own kind rather than folded into Galerie's array (Alex's
 * explicit call): opening it shows just the one image directly, not a
 * one-cell grid pretending to be a gallery.
 */
export class ImagePageModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {};
  }
}
