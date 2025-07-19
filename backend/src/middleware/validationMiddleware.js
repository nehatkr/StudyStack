const { body, param, query, validationResult } = require('express-validator');

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

// Resource validation rules
const validateResourceCreation = [
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
    .isIn(['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX'])
    .withMessage('Invalid resource type'),
  
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
  
  handleValidationErrors
];

const validateResourceUpdate = [
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
  
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean'),
  
  body('allowContact')
    .optional()
    .isBoolean()
    .withMessage('allowContact must be a boolean'),
  
  handleValidationErrors
];

// Parameter validation
const validateResourceId = [
  param('id')
    .isLength({ min: 1 })
    .withMessage('Resource ID is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid resource ID format'),
  
  handleValidationErrors
];

// Query parameter validation for resource listing
const validateResourceQuery = [
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
    .isIn(['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX'])
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

// User validation rules
const validateUserRegistration = [
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
    .isIn(['VIEWER', 'CONTRIBUTOR'])
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

module.exports = {
  validateResourceCreation,
  validateResourceUpdate,
  validateResourceId,
  validateResourceQuery,
  validateUserRegistration,
  handleValidationErrors
};