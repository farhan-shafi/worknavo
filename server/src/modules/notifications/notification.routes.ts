import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { NotificationModel } from '../../models/Notification.model.js';
import { requireOrganizationContext } from '../organizations/organization.service.js';

export const notificationRouter = Router();
notificationRouter.use(requireAuth);
notificationRouter.get('/', async (request, response) => {
  const { organization, membership } = requireOrganizationContext(request);
  const notifications = await NotificationModel.find({
    organizationId: organization._id,
    recipientMembershipId: membership._id,
  })
    .sort({ createdAt: -1 })
    .limit(100);
  response.json({
    notifications: notifications.map((notification) => ({
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      targetUrl: notification.targetUrl ?? null,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    })),
    unread: notifications.filter((notification) => !notification.readAt).length,
  });
});
notificationRouter.post('/:id/read', async (request, response) => {
  const { organization, membership } = requireOrganizationContext(request);
  await NotificationModel.updateOne(
    {
      _id: request.params.id,
      organizationId: organization._id,
      recipientMembershipId: membership._id,
    },
    { $set: { readAt: new Date() } },
  );
  response.json({ message: 'Notification marked as read.' });
});
notificationRouter.post('/read-all', async (request, response) => {
  const { organization, membership } = requireOrganizationContext(request);
  await NotificationModel.updateMany(
    {
      organizationId: organization._id,
      recipientMembershipId: membership._id,
      readAt: { $exists: false },
    },
    { $set: { readAt: new Date() } },
  );
  response.json({ message: 'All notifications marked as read.' });
});
