/**
 * Sharing the address of the current globe.
 * Phone (and some computers): the system share sheet. Otherwise: the link is copied to the
 * clipboard; if even that is not allowed, the link is shown so it can be copied by hand.
 * Returns what happened: "shared", "copied", "shown" or "cancelled".
 */

export async function share({ url, title, text }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled'; // the visitor closed the share sheet
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    prompt('Copiez ce lien :', url);
    return 'shown';
  }
}
