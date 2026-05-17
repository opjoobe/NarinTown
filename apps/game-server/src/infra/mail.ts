import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const PROVIDER = (process.env.MAIL_PROVIDER ?? 'smtp').toLowerCase();
const MAIL_FROM = process.env.MAIL_FROM ?? 'NarinTown <noreply@narintown.local>';

// ===== SMTP (로컬 MailHog 또는 사내 SMTP) =====
const smtpTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'localhost',
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false,
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
});

// ===== Resend (운영) =====
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface MailContent {
  to: string;
  subject: string;
  text: string;
  html: string;
}

async function send(content: MailContent): Promise<void> {
  if (PROVIDER === 'resend') {
    if (!resend) throw new Error('RESEND_API_KEY missing');
    const { error } = await resend.emails.send({
      from: MAIL_FROM,
      to: content.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    if (error) throw new Error(`resend: ${error.message}`);
    return;
  }
  await smtpTransport.sendMail({
    from: MAIL_FROM,
    to: content.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}

export async function sendMagicLink(to: string, link: string): Promise<void> {
  await send({
    to,
    subject: 'NarinTown 입장 링크',
    text: `아래 링크를 15분 내에 클릭해 입장하세요.\n\n${link}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px;">
        <h2 style="color: #00C73C;">🌳 NarinTown</h2>
        <p>아래 버튼을 15분 내에 클릭해 입장하세요.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #00C73C; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">입장하기</a>
        </p>
        <p style="font-size: 12px; color: #888;">버튼이 안 보이면: <a href="${link}">${link}</a></p>
      </div>
    `,
  });
}
