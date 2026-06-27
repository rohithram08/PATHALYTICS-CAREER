// src/backend/utils/emailService.js
//
// Centralized notification sending. Every email this app sends goes
// through sendNotification(), so there's exactly one place that knows
// how to build an email and exactly one place that logs what was sent
// (and what failed) to notification_log.
//
// A failed email is logged but never thrown — losing an email shouldn't
// roll back the status change, application, or job action that
// triggered it. Check notification_log if something looks like it
// didn't arrive.
//
// Add a new notification type by adding one entry to TEMPLATES below.
// Nothing else in the codebase needs to change.

import nodemailer from "nodemailer";
import db from "../db.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const FROM = `"Pathalytics" <${process.env.EMAIL_USER}>`;

const TEMPLATES = {
  recruiter_welcome: ({ name, tier, requiresDocuments }) => ({
    subject: "Welcome to PATHALYTICS Recruiter",
    html: `
      <p>Hi ${name},</p>
      <p>Your recruiter account has been created${tier ? ` (${tier} tier)` : ""}.</p>
      ${
        requiresDocuments
          ? `<p>Your signup email isn't on a recognized corporate domain, so you'll need to upload a verification document before you can publish job listings. <a href="${FRONTEND_URL}/recruiter/profile">Upload now</a>.</p>`
          : `<p>You're ready to post your first job. <a href="${FRONTEND_URL}/recruiter/jobs/new">Post a job</a>.</p>`
      }
    `,
  }),

  application_received: ({ candidateName, jobTitle, jobId }) => ({
    subject: `New application: ${candidateName} applied to ${jobTitle}`,
    html: `
      <p>${candidateName} just applied to <b>${jobTitle}</b>.</p>
      <p><a href="${FRONTEND_URL}/recruiter/jobs/${jobId}/applications">Review applicants</a></p>
    `,
  }),

  application_status_changed: ({ jobTitle, status, stageName }) => ({
    subject: `Your application status: ${status}`,
    html: `
      <p>Your application for <b>${jobTitle}</b> is now <b>${status}</b>${
        stageName ? ` (${stageName})` : ""
      }.</p>
      <p><a href="${FRONTEND_URL}/applications">View your applications</a></p>
    `,
  }),

  application_status_update_confirmation: ({ candidateName, jobTitle, status, stageName }) => ({
    subject: `You updated ${candidateName}'s status to ${status}`,
    html: `
      <p>You moved ${candidateName}'s application for <b>${jobTitle}</b> to <b>${status}</b>${
        stageName ? ` (${stageName})` : ""
      }.</p>
    `,
  }),

  recruiter_verified: ({ name, companyName }) => ({
    subject: "Your recruiter account has been verified",
    html: `
      <p>Hi ${name},</p>
      <p>Your company <b>${companyName}</b> has been verified on PATHALYTICS.</p>
      <p>You can now publish job listings and start receiving applications.
         <a href="${FRONTEND_URL}/recruiter/jobs/new">Post your first job</a>.</p>
    `,
  }),

  recruiter_rejected: ({ name, companyName, rejectionReason }) => ({
    subject: "Action required: Document verification issue",
    html: `
      <p>Hi ${name},</p>
      <p>We were unable to verify the documents submitted for <b>${companyName}</b>.</p>
      ${rejectionReason ? `<p><b>Reason:</b> ${rejectionReason}</p>` : ""}
      <p>Please <a href="${FRONTEND_URL}/recruiter/profile">upload a valid document</a>
         and we will review it again shortly.</p>
    `,
  }),

  application_withdrawn: ({ candidateName, jobTitle }) => ({
    subject: `${candidateName} withdrew their application`,
    html: `<p>${candidateName} withdrew their application for <b>${jobTitle}</b>.</p>`,
  }),
};

/**
 * @param {keyof typeof TEMPLATES} type
 * @param {{ to: string, userId: number, role: 'user'|'recruiter', applicationId?: number, jobId?: number, [key: string]: unknown }} context
 */
export const sendNotification = async (type, { to, userId, role, applicationId, jobId, ...templateData }) => {
  const build = TEMPLATES[type];
  if (!build) {
    console.error(`[emailService] Unknown notification type: ${type}`);
    return;
  }
  const { subject, html } = build(templateData);

  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    await db.query(
      `INSERT INTO notification_log
         (recipient_user_id, recipient_role, notification_type, related_application_id, related_job_id, subject, status)
       VALUES (?, ?, ?, ?, ?, ?, 'sent')`,
      [userId, role, type, applicationId ?? null, jobId ?? null, subject]
    );
  } catch (err) {
    console.error(`[emailService] Failed to send '${type}' to ${to}:`, err.message);
    try {
      await db.query(
        `INSERT INTO notification_log
           (recipient_user_id, recipient_role, notification_type, related_application_id, related_job_id, subject, status, error_message)
         VALUES (?, ?, ?, ?, ?, ?, 'failed', ?)`,
        [userId, role, type, applicationId ?? null, jobId ?? null, subject, err.message]
      );
    } catch (logErr) {
      console.error("[emailService] Also failed to write notification_log:", logErr.message);
    }
  }
};