import * as lark from "@larksuiteoapi/node-sdk";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pg;

async function recallMessage(client, messageId) {
  const response = await client.im.message.delete({
    path: { message_id: messageId },
  });

  if (response.code !== 0) {
    throw new Error(
      `Lark recall failed: code=${response.code}, msg=${response.msg ?? "Unknown error"}`,
    );
  }

  console.log("Recalled Lark message_id:", messageId);
}

async function main(unionId, messageId) {
  if (!unionId) throw new Error("UNION_ID is required");
  if (!messageId) throw new Error("MESSAGE_ID is required");

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  let selectedApp;
  try {
    const { rows } = await db.query(
      `select u.name, u.union_id, a.app_id as app_id_trolyhan, a.app_secret as app_secret_trolyhan
       from han_hrm.users u
       join han_hrm.apps a on a.org_id = u.org_id and a.type = 'assistant'
       where u.union_id = $1
       limit 1`,
      [unionId],
    );
    selectedApp = rows[0];
  } finally {
    await db.end();
  }

  if (!selectedApp) {
    throw new Error(`No user/assistant app found for union_id ${unionId}`);
  }

  const larkClient = new lark.Client({
    appId: selectedApp.app_id_trolyhan,
    appSecret: selectedApp.app_secret_trolyhan,
    disableTokenCache: false,
    domain: lark.Domain.Lark,
  });

  await recallMessage(larkClient, messageId);
  console.log(
    `Message recalled for ${selectedApp.name} - (${selectedApp.union_id})`,
  );
}

const unionId = process.env.UNION_ID;
const messageId = process.env.MESSAGE_ID;

console.log({
  union_id: unionId,
  message_id: messageId,
});

main(unionId, messageId);
