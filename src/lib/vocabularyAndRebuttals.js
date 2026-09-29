/**
 * Custom Rebuttal & Script Storage Helpers
 * Scripts and rebuttals are co-created with the Coach in real time
 * and saved here for the user to refer back to.
 */

// Load all saved rebuttals created with the coach
export function getSavedRebuttals() {
  try {
    return JSON.parse(localStorage.getItem('scriptmaster_saved_rebuttals') || '[]');
  } catch {
    return [];
  }
}

// Save a co-built rebuttal
export function saveRebuttal(rebuttalObj) {
  try {
    const current = getSavedRebuttals();
    const updated = [rebuttalObj, ...current.filter(r => r.id !== rebuttalObj.id)];
    localStorage.setItem('scriptmaster_saved_rebuttals', JSON.stringify(updated));
    window.dispatchEvent(new Event('scriptmaster_rebuttals_changed'));
    return updated;
  } catch (err) {
    console.error('Error saving rebuttal:', err);
    return getSavedRebuttals();
  }
}

// Delete a saved rebuttal
export function deleteRebuttal(id) {
  try {
    const current = getSavedRebuttals();
    const updated = current.filter(r => r.id !== id);
    localStorage.setItem('scriptmaster_saved_rebuttals', JSON.stringify(updated));
    window.dispatchEvent(new Event('scriptmaster_rebuttals_changed'));
    return updated;
  } catch (err) {
    console.error('Error deleting rebuttal:', err);
    return getSavedRebuttals();
  }
}

// Search saved rebuttals
export function searchSavedRebuttals(query) {
  const list = getSavedRebuttals();
  if (!query || !query.trim()) return list;
  const q = query.toLowerCase();
  return list.filter(r =>
    (r.objection && r.objection.toLowerCase().includes(q)) ||
    (r.goldenLine && r.goldenLine.toLowerCase().includes(q)) ||
    (r.category && r.category.toLowerCase().includes(q))
  );
}
