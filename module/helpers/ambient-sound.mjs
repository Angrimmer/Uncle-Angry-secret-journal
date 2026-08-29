import { MODULE_ID } from "./constants.mjs";

// Sheet instance -> {uuid, sound} for that card's ambiance. sound is null
// whenever nothing is actually audible right now - still resolving, ended
// naturally (a one-shot), or manually stopped via toggleAmbianceSound -
// while uuid stays on record so ensureAmbianceSound knows this
// configuration was already handled and won't restart it on the next
// unrelated re-render (e.g. an autosave elsewhere on the card). Same
// WeakMap approach as truncate-hover.mjs's openTooltips.
const activeSounds = new WeakMap();

/**
 * Schema field for a per-card ambient sound - spread into any page model's
 * defineSchema() that should offer one. Not tied to any single card type:
 * every "kind" built in this module is expected to get it. Stores a UUID
 * pointing at a PlaylistSound picked from the world's own Playlists
 * (see pickAmbianceSound) rather than a standalone uploaded file - reusing
 * whatever the world already has set up (and its volume/loop settings)
 * instead of duplicating that configuration per card.
 */
export function ambientSoundSchemaFields() {
  const fields = foundry.data.fields;
  return {
    ambianceSonUuid: new fields.StringField({
      required: false,
      blank: true,
      initial: "",
      label: "UASJ.Ambiance.Label"
    })
  };
}

/**
 * _getFrameButtons() only runs once, on an application's very first render
 * (Foundry core: _renderFrame is skipped on every subsequent render) - so
 * the play/pause icon computed there for the uasjClicSon button goes stale
 * the moment playback starts, stops, or ends on its own. Patched by hand
 * here instead, every time playback state actually changes.
 */
function syncClicSonIcon(sheet) {
  const button = sheet.element?.querySelector('[data-action="uasjClicSon"]');
  if (!button) return;
  const playing = isAmbianceSoundPlaying(sheet);
  button.classList.toggle("fa-volume-high", playing);
  button.classList.toggle("fa-volume-off", !playing);
}

/**
 * Actually resolves and plays the PlaylistSound behind uuid, claiming the
 * WeakMap slot first so a second call racing against this one's awaits
 * (another render, a manual toggle) doesn't start a duplicate sound.
 */
async function startAmbianceSound(sheet, uuid) {
  activeSounds.set(sheet, { uuid, sound: null });

  const source = await foundry.utils.fromUuid(uuid);
  if (!source || (activeSounds.get(sheet)?.uuid !== uuid)) return;

  const sound = await foundry.audio.AudioHelper.play({
    src: source.path,
    loop: source.repeat,
    volume: source.volume,
    // Same channel resolution as PlaylistSound#context - respects the
    // channel the GM already assigned that sound (or its playlist), so it
    // reacts to the same volume slider the GM expects it to.
    channel: source.channel || source.parent?.channel || "music"
  });
  if (!sound) return;
  if (activeSounds.get(sheet)?.uuid !== uuid) {
    // The sheet closed, or the sound reference changed again, while this
    // await was in flight - don't resurrect a stale entry.
    sound.stop();
    return;
  }
  activeSounds.set(sheet, { uuid, sound });
  syncClicSonIcon(sheet);
  sound.addEventListener("end", () => {
    const entry = activeSounds.get(sheet);
    if (entry?.sound === sound) entry.sound = null;
    syncClicSonIcon(sheet);
  });
}

/**
 * Starts or swaps this card's ambient sound so it matches
 * system.ambianceSonUuid - safe to call on every render (a no-op as long as
 * that uuid hasn't changed, regardless of whether the sound ended on its
 * own or was manually stopped via toggleAmbianceSound - a render elsewhere
 * on the card must never override the viewer's own play/stop choice). Each
 * viewer gets their own independent local playback tied to their own copy
 * of the sheet being open (AudioHelper.play with no socketOptions doesn't
 * push to other clients) - not a GM-forced broadcast, and independent of
 * whether the source PlaylistSound happens to be "playing" in the
 * Playlists sidebar (only its file/volume/loop settings are borrowed,
 * never its broadcast state). Open to anyone with the card open, not just
 * the owner - it's atmosphere for whoever's looking, not an edit action;
 * choosing *which* sound plays is what's owner-gated (pickAmbianceSound).
 */
export async function ensureAmbianceSound(sheet) {
  const uuid = sheet.page.system.ambianceSonUuid || null;
  const current = activeSounds.get(sheet);
  if (current?.uuid === uuid) return;

  if (current?.sound) current.sound.stop();
  activeSounds.delete(sheet);
  if (!uuid) {
    syncClicSonIcon(sheet);
    return;
  }

  await startAmbianceSound(sheet, uuid);
}

/**
 * Left-click on the ambiance header button: manually start/stop the
 * currently configured sound, without changing which sound is configured
 * (that's pickAmbianceSound, on right-click). Stopping it this way sticks
 * across re-renders - see ensureAmbianceSound.
 */
export async function toggleAmbianceSound(sheet) {
  const uuid = sheet.page.system.ambianceSonUuid || null;
  if (!uuid) return;

  const current = activeSounds.get(sheet);
  if (current?.sound) {
    current.sound.stop();
    // Keep the uuid on record (sound: null) so the next render's
    // ensureAmbianceSound treats this as "already handled" rather than
    // restarting it.
    activeSounds.set(sheet, { uuid, sound: null });
    syncClicSonIcon(sheet);
    return;
  }
  await startAmbianceSound(sheet, uuid);
}

/** Whether this card's ambiance is currently actually playing (not just configured). */
export function isAmbianceSoundPlaying(sheet) {
  return !!activeSounds.get(sheet)?.sound;
}

/** Call from a sheet's close() so its ambiance doesn't keep playing after the window is gone. */
export function stopAmbientSound(sheet) {
  const current = activeSounds.get(sheet);
  if (!current) return;
  activeSounds.delete(sheet);
  current.sound?.stop();
}

/**
 * Hands off a card's currently-playing ambiance from one sheet instance to
 * another without stopping and restarting it - used when toggling between
 * view and edit mode, which (mode being frozen at construction) closes the
 * old sheet instance and opens a fresh one for the same page. A no-op if
 * nothing is actually playing (e.g. still resolving, or already muted) -
 * close() on the old instance handles cleanup normally in that case, and
 * the new instance's own ensureAmbianceSound call starts it fresh.
 */
export function transferAmbianceSound(fromSheet, toSheet) {
  const current = activeSounds.get(fromSheet);
  if (!current?.sound) return;
  activeSounds.delete(fromSheet);
  activeSounds.set(toSheet, current);
}

/**
 * Lets the card's owner pick which sound, from any world playlist, plays
 * while this card is open - a per-card choice, borrowing the sound's own
 * volume/loop settings rather than re-exposing them here.
 */
export async function pickAmbianceSound(sheet) {
  const current = sheet.page.system.ambianceSonUuid;
  const choices = game.playlists.contents.flatMap(playlist =>
    playlist.sounds.contents.map(sound => ({ value: sound.uuid, label: sound.name, group: playlist.name }))
  );

  const content = await renderTemplate(`modules/${MODULE_ID}/templates/dialogs/choose-ambiance.hbs`, {
    choices,
    current
  });

  const chosen = await foundry.applications.api.DialogV2.prompt({
    window: { title: "UASJ.Ambiance.DefinirTitre" },
    content,
    ok: {
      label: "UASJ.Ambiance.Valider",
      callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object.ambianceSonUuid ?? ""
    }
  });
  if (chosen === null) return; // Dialog dismissed without confirming.

  await sheet.page.update({ "system.ambianceSonUuid": chosen });
}
