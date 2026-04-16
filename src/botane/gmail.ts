import { ImapFlow } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";
import pdfParse from "pdf-parse";
import type { MockEmail, EmailType, Partner } from "./types.js";

const GMAIL_USER = process.env.GMAIL_USER!;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD!;

function createClient(): ImapFlow {
  return new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
    logger: false,
  });
}

function detectPartner(from: string, subject: string, body: string): Partner {
  const all = (from + " " + subject + " " + body).toLowerCase();
  if (all.includes("bijenkorf")) return "de_bijenkorf";
  if (all.includes("westwing")) return "westwing";
  if (all.includes("royal design") || all.includes("royaldesign")) return "royal_design";
  if (all.includes("gant")) return "gant";
  return "unknown";
}

function detectType(subject: string, body: string): EmailType {
  const text = (subject + " " + body).toLowerCase();
  if (text.includes("purchase order") || text.includes("new order") || text.includes("bestelling")) return "new_order";
  if (text.includes("tracking") || text.includes("arrival") || text.includes("shipment")) return "tracking_request";
  if (text.includes("complaint") || text.includes("issue") || text.includes("problem")) return "complaint";
  if (text.includes("backorder") || text.includes("out of stock") || text.includes("delay")) return "backorder";
  return "unknown";
}

async function extractAttachmentText(content: Buffer, filename: string): Promise<string> {
  const name = filename.toLowerCase();
  if (name.endsWith(".pdf")) {
    try {
      const data = await pdfParse(content);
      return data.text.trim();
    } catch {
      return "";
    }
  }
  // For text-based files (csv, txt, etc.)
  return content.toString("utf-8");
}

async function parseEmail(message: { uid: number; source: Buffer }): Promise<MockEmail | null> {
  try {
    const parsed: ParsedMail = await simpleParser(message.source);

    const from = parsed.from?.text ?? "unknown";
    const subject = parsed.subject ?? "(no subject)";
    const date = parsed.date?.toISOString() ?? new Date().toISOString();
    const body = parsed.text ?? "";

    const partner = detectPartner(from, subject, body);
    const type = detectType(subject, body);

    let attachment: { name: string; content: string } | undefined;

    if (parsed.attachments && parsed.attachments.length > 0) {
      const att = parsed.attachments[0];
      const filename = att.filename ?? "attachment";
      const text = await extractAttachmentText(att.content, filename);
      attachment = { name: filename, content: text };
    }

    return {
      id: `email_${message.uid}`,
      from,
      subject,
      date,
      partner,
      type,
      body,
      attachment,
    };
  } catch {
    return null;
  }
}

export async function fetchInbox(): Promise<MockEmail[]> {
  const client = createClient();
  const emails: MockEmail[] = [];

  await client.connect();
  await client.mailboxOpen("INBOX");

  for await (const message of client.fetch("1:30", { envelope: true, source: true })) {
    const email = await parseEmail(message as { uid: number; source: Buffer });
    if (email) emails.push(email);
  }

  await client.logout();

  return emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function fetchEmail(emailId: string): Promise<MockEmail | null> {
  const uid = emailId.replace("email_", "");
  const client = createClient();

  await client.connect();
  await client.mailboxOpen("INBOX");

  let result: MockEmail | null = null;

  for await (const message of client.fetch(uid, { envelope: true, source: true })) {
    result = await parseEmail(message as { uid: number; source: Buffer });
  }

  await client.logout();
  return result;
}
