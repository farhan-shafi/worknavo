import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  createInvoice,
  deleteInvoice,
  downloadInvoice,
  emailInvoice,
  generateInvoiceFromWorkLogs,
  listInvoices,
  markInvoicePaid,
  showInvoice,
  updateInvoice,
} from './invoice.controller.js';

export const invoiceRouter = Router();

invoiceRouter.use(requireAuth);
invoiceRouter.route('/').get(listInvoices).post(createInvoice);
invoiceRouter.post('/generate-from-worklogs', generateInvoiceFromWorkLogs);
invoiceRouter.post('/:id/mark-paid', markInvoicePaid);
invoiceRouter.get('/:id/pdf', downloadInvoice);
invoiceRouter.post('/:id/send-email', emailInvoice);
invoiceRouter
  .route('/:id')
  .get(showInvoice)
  .patch(updateInvoice)
  .delete(deleteInvoice);
