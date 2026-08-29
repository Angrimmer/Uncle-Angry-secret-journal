# Uncle Angry Secret Journal

*[Lire ceci en français](README.md)*

A Foundry VTT module (v13/v14) that turns journal pages into actual character sheets — for people, locations, shops and image galleries — instead of plain wiki pages. System-agnostic: it only ever relies on Foundry's own native fields (name, image, ownership...), never on any specific game system's schema.

## Card types

Each type is created from the picker added to Foundry's native journal creation dialog, and opens directly as a standalone card (without the usual journal chrome — sidebar, page list...).

- **Character** — a Presentation card (portrait, freely draggable and lockable "post-it" info chips, custom background colour) paired with a linked Relations card, one click away. Relations are linked by drag-and-drop or search to any other existing journal, with a public text and a private text whose visibility can be set per player.
- **Location** — icon, quick info, free-text description and a Relations tab, all in one tabbed card.
- **Shop** — same structure as Location, plus a Wares tab: each item references a real Item from your game system (dragged in or searched for), with a price and stock that belong to this shop's listing rather than to the item itself.
- **Gallery** — a grid of images, each with its own short label.
- **Single image** — a window that displays a single image directly.

## Shared features

Available on (almost) every card type above:

- **Ambient sound** — attach a sound from your playlists to a card; it plays for as long as the card stays open. Left click to play/stop, right click to change the sound (owner only).
- **Show to players** — broadcasts the card (or image) to chosen players, one click away from the title bar.
- **Image enlarge & share** — clicking an image enlarges it, with Foundry's own native share button directly accessible (instead of buried in a submenu).
- **Info chips** — short bits of info (age, faction, reputation...) that each card's owner turns on and freely positions, independently of every other card.

## Usage notes

- Info chips are chosen from the window's ⋮ menu ("Choose displayed info"). You then need to switch to edit mode to fill in their value — they only show up in view mode once filled in, at which point they can be dragged and freely positioned.
- The background colour can likewise only be changed in edit mode; view mode just displays it.

## Compatibility

- Foundry VTT v13 and v14.
- No dependency on any specific game system — tested including with a custom system that has no standard item schema.

## Installation

In Foundry, go to the **Add-on Modules** tab → **Install Module**, then paste this repository's manifest URL. You can also download the latest version from this repository's [Releases](../../releases) tab and extract it into your `Data/modules` folder.

## Inspiration

The structure of some cards (Location, Shop) is inspired by the ergonomics of the [Monk's Enhanced Journal](https://foundryvtt.com/packages/monks-enhanced-journal) module — used as a reference for behaviour -and visual sometimes- only. No code was reused from it; this module was built independently, from scratch.

## Why this module

I know modules like this already exist. I simply wanted to build one that matched my own expectations, putting front and center what mattered most to me. I'll probably keep developing it as my own gaming needs evolve — and if it clicks for someone else along the way, that would genuinely make me happy.

## Languages

French (complete), English (complete).

## Feedback and suggestions

This is my very first published Foundry module — any feedback, thoughts, or suggestions for improvement are welcome, feel free to open an [issue](../../issues).

## Support the project

If this module has been useful to you, a small tip on [Ko-fi](https://ko-fi.com/angrimmer) is always appreciated. No obligation, of course!
