import * as lark from "@larksuiteoapi/node-sdk";
import pg from "pg";
import crypto from "crypto";
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
      // Bold kiểu ~~text~~
      if (part.startsWith("~~") && part.endsWith("~~")) {
        return { tag: "text", text: part.slice(2, -2), style: ["bold"] };
      }

      // Bold kiểu **text**
      if (part.startsWith("**") && part.endsWith("**")) {
        return { tag: "text", text: part.slice(2, -2), style: ["bold"] };
      }

      // Bold + Italic kiểu ~*text*~
      if (part.startsWith("~*") && part.endsWith("*~")) {
        return {
          tag: "text",
          text: part.slice(2, -2),
          style: ["bold", "italic"],
        };
      }

      // Text thường
      return { tag: "text", text: part };
    });
  });
}
async function sendGroup(client, chatId, title, message) {
  const uuid = crypto.randomUUID();
  const blocks = mdToLarkPostBlocks(message);
  console.log("Blocks:", JSON.stringify(blocks, null, 2));

  await client.im.message.create({
    params: { receive_id_type: "chat_id" },
    data: {
      receive_id: chatId, // oc_xxxxx
      msg_type: "post",
      content: JSON.stringify({
        en_us: {
          title,
          content: blocks,
        },
      }),
      uuid,
    },
  });
}

async function main(db_name, chat_id, title, messageText) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(db_name)) {
    throw new Error(`Invalid table name: ${db_name}`);
  }

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  let resSeclect;
  try {
    const { rows } = await db.query(
      `select name, chat_id, app_id_trolyhan, app_secret_trolyhan
       from public."${db_name}"
       where chat_id = $1
       limit 1`,
      [chat_id],
    );
    resSeclect = rows[0];
  } finally {
    await db.end();
  }

  if (!resSeclect) {
    throw new Error(`No group found for chat_id ${chat_id}`);
  }

  const larkClient = new lark.Client({
    appId: resSeclect.app_id_trolyhan,
    appSecret: resSeclect.app_secret_trolyhan,
    disableTokenCache: false,
    domain: lark.Domain.Lark,
  });

  await sendGroup(
    larkClient,
    resSeclect.chat_id,
    title,
    messageText,
  );

  console.log("Sent message to group:", resSeclect.chat_id);
}

const chat_id = process.env.CHAT_ID;
const db_name = process.env.DB_CHAT_NAME;
const messageText = process.env.MESSAGE_TEXT;
const title = process.env.TITLE;

console.log({
  chat_id,
  db_name,
  messageText,
  title,
});

main(db_name, chat_id, title, messageText);
