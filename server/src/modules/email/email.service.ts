import nodemailer from 'nodemailer';

import { env } from '../../config/env.js';
import type { ClientDocument } from '../../models/Client.model.js';
import {
  EmailLogModel,
  type EmailDocumentType,
} from '../../models/EmailLog.model.js';
import type { UserDocument } from '../../models/User.model.js';
import type { OrganizationDocument } from '../../models/Organization.model.js';
import type { OrganizationMembershipDocument } from '../../models/OrganizationMembership.model.js';
import { NotificationModel } from '../../models/Notification.model.js';
import { ApiError } from '../../utils/api-error.js';

interface SendDocumentEmailInput {
  user: UserDocument;
  organization: OrganizationDocument;
  membership: OrganizationMembershipDocument;
  client: ClientDocument;
  documentId: string;
  documentType: EmailDocumentType;
  subject: string;
  text: string;
  html: string;
  filename: string;
  pdf: Buffer;
}

function smtpConfiguration() {
  const fromAddress = env.SMTP_FROM ?? env.SMTP_USER;

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !fromAddress) {
    throw new ApiError(
      503,
      'Email is not configured yet. Add SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM to server/.env.',
    );
  }

  return {
    fromAddress,
    transporter: nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    }),
  };
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 2000);
  }

  return 'Unknown email delivery error.';
}

export async function sendDocumentEmail(input: SendDocumentEmailInput) {
  const log = await EmailLogModel.create({
    userId: input.user._id,
    organizationId: input.organization._id,
    createdByUserId: input.user._id,
    clientId: input.client._id,
    documentId: input.documentId,
    documentType: input.documentType,
    recipient: input.client.email,
    subject: input.subject,
    status: 'pending',
  });

  try {
    const { fromAddress, transporter } = smtpConfiguration();
    const result = await transporter.sendMail({
      from: {
        name: env.SMTP_FROM_NAME,
        address: fromAddress,
      },
      to: input.client.email,
      replyTo: input.user.email,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: [
        {
          filename: input.filename,
          content: input.pdf,
          contentType: 'application/pdf',
        },
      ],
    });

    await EmailLogModel.findByIdAndUpdate(log._id, {
      $set: {
        providerMessageId: result.messageId,
        sentAt: new Date(),
        status: 'sent',
      },
      $unset: { errorMessage: 1 },
    });
  } catch (error) {
    await EmailLogModel.findByIdAndUpdate(log._id, {
      $set: {
        errorMessage: safeErrorMessage(error),
        status: 'failed',
      },
    });
    await NotificationModel.create({
      organizationId: input.organization._id,
      recipientMembershipId: input.membership._id,
      type: 'email_delivery_failed',
      title: 'Email delivery failed',
      message: `${input.documentType === 'invoice' ? 'Invoice' : 'Report'} email to ${input.client.email} could not be delivered.`,
      targetUrl:
        input.documentType === 'invoice' ? '/app/invoices' : '/app/reports',
    });

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      502,
      'The email provider could not deliver this message. Check your SMTP settings and try again.',
    );
  }
}

export async function sendWorkspaceInvitationEmail(input: {
  recipient: string;
  inviterName: string;
  organizationName: string;
  acceptUrl: string;
}) {
  const { fromAddress, transporter } = smtpConfiguration();
  await transporter.sendMail({
    from: {
      name: env.SMTP_FROM_NAME,
      address: fromAddress,
    },
    to: input.recipient,
    subject: `Join ${input.organizationName}`,
    text: `${input.inviterName} invited you to join ${input.organizationName}. Accept the invitation: ${input.acceptUrl}`,
    html: `<p><strong>${input.inviterName}</strong> invited you to join <strong>${input.organizationName}</strong>.</p><p><a href="${input.acceptUrl}">Accept invitation</a></p><p>This link expires in 7 days.</p>`,
  });
}
