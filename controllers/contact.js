import asyncHandler from '../middlewares/async.js';
import ErrorResponse from '../utils/errorResponse.js';

// @desc    Create a contact submission
// @route   POST /api/v1/contacts
// @access  Public
export const createContact = asyncHandler(async (req, res, next) => {
  const { Contact } = req.db.ecommerce.models;
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return next(new ErrorResponse('Please provide a name, email, and message', 400));
  }

  const contact = await Contact.create({
    name,
    email,
    message,
  });

  res.status(201).json({
    success: true,
    data: contact,
  });
});

// @desc    Get all contact submissions
// @route   GET /api/v1/contacts
// @access  Private/Admin
export const getContacts = asyncHandler(async (req, res, next) => {
  const { Contact } = req.db.ecommerce.models;
  const contacts = await Contact.findAll({
    order: [['createdAt', 'DESC']],
  });
  res.status(200).json({ success: true, data: contacts });
});

// @desc    Update a contact submission (e.g., mark as read)
// @route   PUT /api/v1/contacts/:id
// @access  Private/Admin
export const updateContact = asyncHandler(async (req, res, next) => {
  const { Contact } = req.db.ecommerce.models;
  const { isRead } = req.body;

  let contact = await Contact.findByPk(req.params.id);

  if (!contact) {
    return next(new ErrorResponse(`Contact not found with id of ${req.params.id}`, 404));
  }

  contact.isRead = isRead;
  await contact.save();

  res.status(200).json({ success: true, data: contact });
});

// @desc    Delete a contact submission
// @route   DELETE /api/v1/contacts/:id
// @access  Private/Admin
export const deleteContact = asyncHandler(async (req, res, next) => {
  const { Contact } = req.db.ecommerce.models;
  const contact = await Contact.findByPk(req.params.id);

  if (!contact) {
    return next(new ErrorResponse(`Contact not found with id of ${req.params.id}`, 404));
  }

  await contact.destroy();

  res.status(200).json({ success: true, data: {} });
});
