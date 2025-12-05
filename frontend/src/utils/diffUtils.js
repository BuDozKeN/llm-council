import { diffWords } from 'diff';

/**
 * Compute an inline diff between two strings.
 * Returns an array of parts with type 'added', 'removed', or 'unchanged'.
 *
 * @param {string} oldText - The original text
 * @param {string} newText - The proposed new text
 * @returns {Array<{type: 'added'|'removed'|'unchanged', value: string}>}
 */
export function computeInlineDiff(oldText, newText) {
  if (!oldText && !newText) {
    return [];
  }

  // If no old text, everything is added
  if (!oldText) {
    return [{ type: 'added', value: newText }];
  }

  // If no new text, everything is removed
  if (!newText) {
    return [{ type: 'removed', value: oldText }];
  }

  const diff = diffWords(oldText, newText);

  return diff.map(part => ({
    type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
    value: part.value
  }));
}

/**
 * Check if there are actual changes between old and new text.
 * @param {string} oldText - The original text
 * @param {string} newText - The proposed new text
 * @returns {boolean}
 */
export function hasChanges(oldText, newText) {
  if (!oldText && !newText) return false;
  if (!oldText || !newText) return true;

  // Normalize whitespace for comparison
  const normalizedOld = oldText.trim().replace(/\s+/g, ' ');
  const normalizedNew = newText.trim().replace(/\s+/g, ' ');

  return normalizedOld !== normalizedNew;
}
