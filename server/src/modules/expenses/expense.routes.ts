import { Router } from 'express';

import { workspaceActor } from '../../auth/workspace-context.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-error.js';
import {
  createExpense,
  deleteExpense,
  getExpense,
  listExpenses,
  updateExpense,
} from './expense.service.js';
import {
  createExpenseSchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from './expense.validation.js';

export const expenseRouter = Router();

expenseRouter.use(requireAuth);
expenseRouter
  .route('/')
  .get(async (request, response) => {
    const filters = listExpensesQuerySchema.parse(request.query);
    response.json(await listExpenses(workspaceActor(request), filters));
  })
  .post(async (request, response) => {
    const input = createExpenseSchema.parse(request.body);
    const expense = await createExpense(workspaceActor(request), input);
    response.status(201).json({
      message: 'Expense created successfully.',
      expense,
    });
  });

expenseRouter
  .route('/:id')
  .get(async (request, response) => {
    const { id } = request.params;
    if (!id) throw new ApiError(404, 'Expense not found.');
    const { contract } = await getExpense(workspaceActor(request), id);
    response.json({ expense: contract });
  })
  .patch(async (request, response) => {
    const { id } = request.params;
    if (!id) throw new ApiError(404, 'Expense not found.');
    const input = updateExpenseSchema.parse(request.body);
    if (Object.keys(input).length === 0) {
      throw new ApiError(422, 'Provide at least one expense field to update.');
    }
    const expense = await updateExpense(workspaceActor(request), id, input);
    response.json({ message: 'Expense updated successfully.', expense });
  })
  .delete(async (request, response) => {
    const { id } = request.params;
    if (!id) throw new ApiError(404, 'Expense not found.');
    await deleteExpense(workspaceActor(request), id);
    response.json({ message: 'Expense deleted successfully.' });
  });
