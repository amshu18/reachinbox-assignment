
import { Client } from "@elastic/elasticsearch";

export const elasticClient = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
});

const INDEX_NAME = "reachinbox-emails";

export async function ensureEmailIndex() {
  const exists = await elasticClient.indices.exists({
    index: INDEX_NAME,
  });

  if (!exists) {
    await elasticClient.indices.create({
      index: INDEX_NAME,
      mappings: {
        properties: {
          email_id: { type: "keyword" },
          recipient_email: { type: "text" },
          subject: { type: "text" },
          body: { type: "text" },
          status: { type: "keyword" },
          scheduled_at: { type: "date" },
          sent_at: { type: "date" },
          sender_email: { type: "keyword" },
        },
      },
    });

    console.log("Elasticsearch email index created.");
  }
}

export async function indexEmail(email: {
  id: string;
  recipient_email: string;
  subject: string;
  body: string;
  status: string;
  scheduled_at: Date | string;
  sent_at?: Date | string | null;
  sender_email?: string | null;
}) {
  await elasticClient.index({
    index: INDEX_NAME,
    id: email.id,
    document: {
      email_id: email.id,
      recipient_email: email.recipient_email,
      subject: email.subject,
      body: email.body,
      status: email.status,
      scheduled_at: email.scheduled_at,
      sent_at: email.sent_at || null,
      sender_email: email.sender_email || "",
    },
    refresh: true,
  });
}

export { INDEX_NAME };
