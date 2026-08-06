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

async function sendDM(client, openId, title, message) {
  const uuid = crypto.randomUUID();
  const blocks = mdToLarkPostBlocks(message);
  console.log("Blocks:", JSON.stringify(blocks, null, 2));

  await client.im.message.create({
    params: { receive_id_type: "open_id" },
    data: {
      receive_id: openId,
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

async function main(ou_id, title, messageText) {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  let resSeclect;
  try {
    const { rows } = await db.query(
      `select u.name, u.open_id, a.app_id as app_id_trolyhan, a.app_secret as app_secret_trolyhan
       from han_hrm.users u
       join han_hrm.apps a on a.org_id = u.org_id and a.type = 'assistant'
       where u.open_id = $1
       limit 1`,
      [ou_id],
    );
    resSeclect = rows[0];
  } finally {
    await db.end();
  }

  if (!resSeclect) {
    throw new Error(`No user/assistant app found for open_id ${ou_id}`);
  }

  const larkClient = new lark.Client({
    appId: resSeclect.app_id_trolyhan,
    appSecret: resSeclect.app_secret_trolyhan,
    disableTokenCache: false,
    domain: lark.Domain.Lark,
  });

  await sendDM(larkClient, resSeclect.open_id, title, messageText);
  console.log(
    `Message sent to ${resSeclect.name} - (${resSeclect.open_id}) - messageText: ${messageText}`,
  );
}

const ou_id = process.env.OU_ID;
const messageText = process.env.MESSAGE_TEXT;
const title = process.env.TITLE;

console.log({
  ou_id,
  messageText,
  title,
});

main(ou_id, title, messageText);
