/**
 * Edgit Error Module
 *
 * Exports typed error classes for proper error handling
 */

export {
  EdgitError,
  isEdgitError,
  componentNotFound,
  componentExists,
  invalidVersion,
  tagNotFound,
  tagExists,
  registryNotFound,
  gitError,
  validationError,
  type EdgitErrorCode,
} from './edgit-error.js'
