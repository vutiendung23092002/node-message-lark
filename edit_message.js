import * as lark from "@larksuiteoapi/node-sdk";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pg;

function mdToLarkPostBlocks(message) {
  const lines = message.split("\n");

  return lines.map((line) => {
    if (!line.trim()) return [{ tag: "text", text: "\n" }];

    const parts = line
      .split(/(\*\*.*?\*\*|~~.*?~~|~\*.*?\*~)/gs)
      .filter(Boolean);

    return parts.map((part) => {
      if (part.startsWith("~~") && part.endsWith("~~")) {
        return { tag: "text", text: part.slice(2, -2), style: ["bold"] };
      }

      if (part.startsWith("**") && part.endsWith("**")) {
        return { tag: "text", text: part.slice(2, -2), style: ["bold"] };
      }

      if (part.startsWith("~*") && part.endsWith("*~")) {
        return {
          tag: "text",
          text: part.slice(2, -2),
          style: ["bold", "italic"],
        };
      }

      return { tag: "text", text: part };
    });
  });
}

async function updateMessage(client, messageId, title, newMessageText) {
  const blocks = mdToLarkPostBlocks(newMessageText);
  console.log("Blocks:", JSON.stringify(blocks, null, 2));

  const response = await client.im.message.update({
    path: { message_id: messageId },
    data: {
      msg_type: "post",
      content: JSON.stringify({
        en_us: {
          title,
          content: blocks,
        },
      }),
    },
  });

  if (response.code !== 0) {
    throw new Error(
      `Lark update failed: code=${response.code}, msg=${response.msg ?? "Unknown error"}`,
    );
  }

  console.log(
    "Updated Lark message_id:",
    response.data?.message_id ?? messageId,
  );
}

async function main(openId, messageId, title, newMessageText) {
  if (!openId) throw new Error("OPEN_ID is required");
  if (!messageId) throw new Error("MESSAGE_ID is required");
  if (!title) throw new Error("TITLE is required");
  if (!newMessageText) throw new Error("NEW_MESSAGE_TEXT is required");

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  let selectedApp;
  try {
    const { rows } = await db.query(
      `select u.name, u.open_id, a.app_id as app_id_trolyhan, a.app_secret as app_secret_trolyhan
       from han_hrm.users u
       join han_hrm.apps a on a.org_id = u.org_id and a.type = 'assistant'
       where u.open_id = $1
       limit 1`,
      [openId],
    );
    selectedApp = rows[0];
  } finally {
    await db.end();
  }

  if (!selectedApp) {
    throw new Error(`No user/assistant app found for open_id ${openId}`);
  }

  const larkClient = new lark.Client({
    appId: selectedApp.app_id_trolyhan,
    appSecret: selectedApp.app_secret_trolyhan,
    disableTokenCache: false,
    domain: lark.Domain.Lark,
  });

  await updateMessage(larkClient, messageId, title, newMessageText);
  console.log(
    `Message updated for ${selectedApp.name} - (${selectedApp.open_id})`,
  );
}

const openId = process.env.OPEN_ID;
const messageId = process.env.MESSAGE_ID;
const title = process.env.TITLE;
const newMessageText = process.env.NEW_MESSAGE_TEXT;

console.log({
  open_id: openId,
  message_id: messageId,
  title,
  new_message_text: newMessageText,
});

main(openId, messageId, title, newMessageText);
