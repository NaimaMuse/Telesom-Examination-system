const mongoose = require('mongoose');

const sendError = (error, next, res) => {
  if (error.statusCode) {
    res.status(error.statusCode);
  } else if (error.code === 11000) {
    res.status(409);
  } else if (
    error.name === 'ValidationError' ||
    error.name === 'CastError' ||
    error.name === 'BSONError'
  ) {
    res.status(400);
  }
  next(error);
};

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    sendError(error, next, res);
  }
};

const pick = (source, fields) =>
  fields.reduce((result, field) => {
    if (Object.prototype.hasOwnProperty.call(source || {}, field)) {
      result[field] = source[field];
    }
    return result;
  }, {});

const parsePositiveInteger = (value, fallback, label, max = Infinity) => {
  if (value === undefined) {
    return fallback;
  }
  if (!/^\d+$/.test(String(value)) || Number(value) < 1) {
    const error = new Error(`${label} must be a positive integer`);
    error.statusCode = 400;
    throw error;
  }
  return Math.min(Number(value), max);
};

const createResourceController = (Model, options) => {
  const {
    fields,
    filterFields = [],
    populate = [],
    defaultSort = '-createdAt',
    sortFields = ['createdAt', 'updatedAt'],
    beforeCreate,
    beforeUpdate,
  } = options;

  const list = asyncHandler(async (req, res) => {
    const query = req.query || {};
    const filters = {};
    for (const field of filterFields) {
      if (query[field] !== undefined) {
        if (
          typeof query[field] !== 'string' &&
          typeof query[field] !== 'boolean'
        ) {
          const error = new Error(`Invalid ${field} filter`);
          error.statusCode = 400;
          throw error;
        }
        filters[field] = query[field];
      }
    }

    const page = parsePositiveInteger(query.page, 1, 'page');
    const limit = parsePositiveInteger(query.limit, 25, 'limit', 100);
    const requestedSort = query.sort || defaultSort;
    if (typeof requestedSort !== 'string') {
      const error = new Error('Invalid sort field');
      error.statusCode = 400;
      throw error;
    }
    const sortField = String(requestedSort).replace(/^-/, '');
    if (!sortFields.includes(sortField)) {
      const error = new Error('Invalid sort field');
      error.statusCode = 400;
      throw error;
    }
    const sort = requestedSort.startsWith('-')
      ? { [sortField]: -1 }
      : { [sortField]: 1 };

    let recordsQuery = Model.find(filters)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);
    for (const path of populate) {
      recordsQuery = recordsQuery.populate(path);
    }

    const [records, total] = await Promise.all([
      recordsQuery,
      Model.countDocuments(filters),
    ]);
    res.status(200).json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  });

  const getById = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error('Invalid resource ID');
    }
    let recordQuery = Model.findById(req.params.id);
    for (const path of populate) {
      recordQuery = recordQuery.populate(path);
    }
    const record = await recordQuery;
    if (!record) {
      res.status(404);
      throw new Error('Resource not found');
    }
    res.status(200).json({ success: true, data: record });
  });

  const create = asyncHandler(async (req, res) => {
    const data = pick(req.body, fields);
    if (beforeCreate) {
      Object.assign(data, beforeCreate(req));
    }
    const record = await Model.create(data);
    res.status(201).json({ success: true, data: record });
  });

  const update = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error('Invalid resource ID');
    }
    const data = pick(req.body, fields);
    if (beforeUpdate) {
      Object.assign(data, beforeUpdate(req));
    }
    const record = await Model.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!record) {
      res.status(404);
      throw new Error('Resource not found');
    }
    res.status(200).json({ success: true, data: record });
  });

  const remove = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error('Invalid resource ID');
    }
    const record = await Model.findByIdAndDelete(req.params.id);
    if (!record) {
      res.status(404);
      throw new Error('Resource not found');
    }
    res.status(200).json({
      success: true,
      message: 'Resource deleted successfully',
      data: record,
    });
  });

  return { list, getById, create, update, remove };
};

module.exports = {
  asyncHandler,
  createResourceController,
  pick,
  sendError,
};
