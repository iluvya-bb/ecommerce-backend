import express from 'express';
import {
  createContact,
  getContacts,
  updateContact,
  deleteContact,
} from '../controllers/contact.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

router
  .route('/')
  .post(createContact)
  .get(protect, authorize('admin'), getContacts);

router
  .route('/:id')
  .put(protect, authorize('admin'), updateContact)
  .delete(protect, authorize('admin'), deleteContact);

export default router;
