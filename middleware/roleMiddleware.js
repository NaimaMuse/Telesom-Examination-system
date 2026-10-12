const VALID_ROLES = ['admin', 'teacher', 'student'];

/**
 * Role-based authorization middleware factory
 * @param  {...string|string[]} allowedRoles - Roles permitted to access the route
 * @returns {Function} Express middleware function
 */
const authorizeRoles = (...allowedRoles) => {
  // Flatten in case roles are passed as an array e.g. authorizeRoles(['admin', 'teacher'])
  const roles = allowedRoles.flat();

  // Reject configuration if no roles are provided
  if (roles.length === 0) {
    throw new Error('Role authorization configuration error: At least one role must be specified');
  }

  // Reject invalid role configurations during server setup
  for (const role of roles) {
    if (typeof role !== 'string' || !VALID_ROLES.includes(role)) {
      throw new Error(
        `Role authorization configuration error: '${role}' is not a valid system role (${VALID_ROLES.join(', ')})`
      );
    }
  }

  return (req, res, next) => {
    // 1. Ensure user is authenticated
    if (!req.user) {
      res.status(401);
      return next(new Error('Not authorized, user authentication required'));
    }

    // 2. Ensure user role is in the allowed roles list
    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(
        new Error(`Access forbidden: Role '${req.user.role}' is not authorized to access this resource`)
      );
    }

    // 3. User is authorized
    next();
  };
};

module.exports = {
  authorizeRoles,
  VALID_ROLES,
};
