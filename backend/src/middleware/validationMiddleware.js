// backend/src/middleware/validationMiddleware.js
import { body, param, query, validationResult } from 'express-validator';

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Resource validation rules for creation
export const validateResourceCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters')
    .escape(),

  body('description')
    .trim()
    .isLength({ min: 50, max: 500 })
    .withMessage('Description must be between 50 and 500 characters')
    .escape(),

  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isIn([
      'computer-science',
      'mathematics',
      'physics',
      'chemistry',
      'biology',
      'engineering',
      'business',
      'literature',
      'history',
      'economics'
    ])
    .withMessage('Invalid subject'),

  body('resourceType')
    .notEmpty()
    .withMessage('Resource type is required')
    .isIn(['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX', 'OTHER', 'LINK']) // Added 'OTHER' and 'LINK'
    .withMessage('Invalid resource type'),

  // Conditional validation based on resourceType
  // For LINK resources:
  body('url')
    .if(body('resourceType').equals('LINK'))
    .isURL()
    .withMessage('URL is required and must be a valid URL for LINK resource type'),
  body('isExternal')
    .if(body('resourceType').equals('LINK'))
    .isBoolean()
    .withMessage('isExternal must be a boolean for LINK resource type'),
  // Ensure file-related fields are NOT present for LINK
  body(['fileName', 'filePath', 'fileSize', 'mimeType'])
    .if(body('resourceType').equals('LINK'))
    .not()
    .exists()
    .withMessage('File-related fields should not be present for LINK resource type'),

  // For non-LINK resources (file-based):
  body('fileName')
    .if(body('resourceType').not().equals('LINK'))
    .notEmpty().withMessage('File name is required for file-based resource types'),
  body('filePath')
    .if(body('resourceType').not().equals('LINK'))
    .isString().withMessage('File path is required for file-based resource types'), // Assuming this is a path string, not necessarily a full URL yet
  body('fileSize')
    .if(body('resourceType').not().equals('LINK'))
    .isInt({ gt: 0 }).withMessage('File size must be a positive integer for file-based resource types'),
  body('mimeType')
    .if(body('resourceType').not().equals('LINK'))
    .notEmpty().withMessage('MIME type is required for file-based resource types'),
  // Ensure URL/isExternal are NOT present for non-LINK
  body(['url', 'isExternal'])
    .if(body('resourceType').not().equals('LINK'))
    .not()
    .exists()
    .withMessage('URL/isExternal should not be present for file-based resource types'),

  body('semester')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Semester must be less than 50 characters'),

  body('tags')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 tags allowed'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters'),

  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean'),

  body('allowContact')
    .optional()
    .isBoolean()
    .withMessage('allowContact must be a boolean'),

  body('year') // For PYQ type
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 5 })
    .withMessage('Year must be a valid year'),

  handleValidationErrors
];

export const validateResourceUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 50, max: 500 })
    .withMessage('Description must be between 50 and 500 characters')
    .escape(),

  body('subject')
    .optional()
    .trim()
    .isIn([
      'computer-science',
      'mathematics',
      'physics',
      'chemistry',
      'biology',
      'engineering',
      'business',
      'literature',
      'history',
      'economics'
    ])
    .withMessage('Invalid subject'),

  body('semester')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Semester must be less than 50 characters'),

  body('tags')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 tags allowed'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters'),

  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean'),

  body('allowContact')
    .optional()
    .isBoolean()
    .withMessage('allowContact must be a boolean'),

  body('year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 5 })
    .withMessage('Year must be a valid year'),

  // For updates, we generally don't re-validate fileName, filePath, etc., unless they are explicitly sent.
  // If you allow changing resourceType from file to link or vice-versa, you'd need more complex logic here.

  handleValidationErrors
];

// Parameter validation
export const validateResourceId = [
  param('id')
    .isUUID() // Assuming your resource IDs are UUIDs generated by Prisma/DB
    .withMessage('Invalid resource ID format (must be a UUID)'),

  handleValidationErrors
];

// Query parameter validation for resource listing
export const validateResourceQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  query('subject')
    .optional()
    .trim()
    .isIn([
      'computer-science',
      'mathematics',
      'physics',
      'chemistry',
      'biology',
      'engineering',
      'business',
      'literature',
      'history',
      'economics'
    ])
    .withMessage('Invalid subject'),

  query('resourceType')
    .optional()
    .isIn(['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX', 'OTHER', 'LINK']) // Added 'OTHER' and 'LINK'
    .withMessage('Invalid resource type'),

  query('semester')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Semester must be less than 50 characters'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .escape(),

  query('sortBy')
    .optional()
    .isIn(['newest', 'oldest', 'popular', 'downloads', 'title'])
    .withMessage('Invalid sort option'),

  handleValidationErrors
];

// User validation rules (assuming this is for a separate user route)
export const validateUserRegistration = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),

  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .escape(),

  body('role')
    .optional()
    .isIn(['VIEWER', 'CONTRIBUTOR', 'ADMIN']) // Added ADMIN as a possible role
    .withMessage('Invalid role'),

  body('institution')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Institution must be less than 100 characters')
    .escape(),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters')
    .escape(),

  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Invalid phone number'),

  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Invalid website URL'),

  handleValidationErrors
];

// The default export is no longer needed if you use named exports for each validator.
// If you still want a default export for convenience, you can keep it, but ensure
// you import it correctly in resourceRoutes.js (e.g., `import * as validators from '../middleware/validationMiddleware.js';`)
// For now, I'll remove the default export as named exports are clearer.
// export default {
//   validateResourceCreation,
//   validateResourceUpdate,
//   validateResourceId,
//   validateResourceQuery,
//   validateUserRegistration,
//   handleValidationErrors
// };
