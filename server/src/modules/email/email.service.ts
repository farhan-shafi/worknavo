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

interface EmailAttachment {
  content: Buffer;
  contentType?: string;
  filename: string;
}

interface SendEmailInput {
  attachments?: EmailAttachment[];
  html: string;
  replyTo?: string;
  subject: string;
  text: string;
  to: string;
}

interface ResendEmailResponse {
  id?: string;
  message?: string;
}

function fromAddress() {
  return env.SMTP_FROM ?? env.SMTP_USER;
}

function fromName() {
  return env.SMTP_FROM_NAME || 'WorkNavo';
}

function formattedFromAddress(address: string) {
  return `${fromName()} <${address}>`;
}

function smtpConfiguration() {
  const senderAddress = fromAddress();

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !senderAddress) {
    throw new ApiError(
      503,
      'Email is not configured yet. Add SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM to server/.env.',
    );
  }

  return {
    fromAddress: senderAddress,
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

async function sendSmtpEmail(input: SendEmailInput) {
  const { fromAddress: senderAddress, transporter } = smtpConfiguration();
  const result = await transporter.sendMail({
    attachments: input.attachments?.map((attachment) => ({
      content: attachment.content,
      contentType: attachment.contentType,
      filename: attachment.filename,
    })),
    from: {
      name: fromName(),
      address: senderAddress,
    },
    html: input.html,
    replyTo: input.replyTo,
    subject: input.subject,
    text: input.text,
    to: input.to,
  });

  return result.messageId;
}

async function sendResendEmail(input: SendEmailInput) {
  const senderAddress = fromAddress();

  if (!env.RESEND_API_KEY || !senderAddress) {
    throw new ApiError(
      503,
      'Email is not configured yet. Add RESEND_API_KEY and SMTP_FROM to server/.env.',
    );
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      attachments: input.attachments?.map((attachment) => ({
        content: attachment.content.toString('base64'),
        filename: attachment.filename,
      })),
      from: formattedFromAddress(senderAddress),
      html: input.html,
      reply_to: input.replyTo,
      subject: input.subject,
      text: input.text,
      to: [input.to],
    }),
  });

  const body = (await response
    .json()
    .catch(() => null)) as ResendEmailResponse | null;

  if (!response.ok) {
    throw new ApiError(
      502,
      body?.message ??
        `Resend could not deliver this email. Status ${response.status}.`,
    );
  }

  return body?.id;
}

async function sendEmail(input: SendEmailInput) {
  if (env.RESEND_API_KEY) {
    return sendResendEmail(input);
  }

  return sendSmtpEmail(input);
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
    const providerMessageId = await sendEmail({
      attachments: [
        {
          content: input.pdf,
          contentType: 'application/pdf',
          filename: input.filename,
        },
      ],
      html: input.html,
      to: input.client.email,
      replyTo: input.user.email,
      subject: input.subject,
      text: input.text,
    });

    await EmailLogModel.findByIdAndUpdate(log._id, {
      $set: {
        providerMessageId,
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
      'The email provider could not deliver this message. Check your email settings and try again.',
    );
  }
}

export async function sendWorkspaceInvitationEmail(input: {
  recipient: string;
  inviterName: string;
  organizationName: string;
  acceptUrl: string;
}) {
  await sendEmail({
    to: input.recipient,
    subject: `Join ${input.organizationName}`,
    text: `${input.inviterName} invited you to join ${input.organizationName}. Accept the invitation: ${input.acceptUrl}`,
    html: `<p><strong>${input.inviterName}</strong> invited you to join <strong>${input.organizationName}</strong>.</p><p><a href="${input.acceptUrl}">Accept invitation</a></p><p>This link expires in 7 days.</p>`,
  });
}

export async function sendPasswordResetEmail(input: {
  recipient: string;
  recipientName: string;
  resetCode: string;
  expiresInMinutes: number;
}) {
  await sendEmail({
    to: input.recipient,
    subject: 'Reset your WorkNavo password',
    text: `Hi ${input.recipientName},\n\nUse this temporary code to reset your WorkNavo password:\n${input.resetCode}\n\nThis code expires in ${input.expiresInMinutes} minutes. If you did not request it, you can ignore this email.`,
    html: `<p>Hi ${input.recipientName},</p><p>Use this temporary code to reset your WorkNavo password:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${input.resetCode}</p><p>This code expires in ${input.expiresInMinutes} minutes. If you did not request it, you can ignore this email.</p>`,
  });
}

export async function sendScheduledSummaryEmail(input: {
  recipient: string;
  subject: string;
  text: string;
  html: string;
}) {
  return sendEmail({
    to: input.recipient,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
