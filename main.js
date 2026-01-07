import * as lark from "@larksuiteoapi/node-sdk";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();


function mdToLarkContent(message) {
  return message.replace(/\*\*(.*?)\*\*/gs, "<b>$1</b>");
}

async function sendDM(client, openId, message) {
  const uuid = crypto.randomUUID();
  await client.im.message.create({
    params: { receive_id_type: "open_id" },
    data: {
      receive_id: openId,
      msg_type: "text",
      content: JSON.stringify({ text: mdToLarkContent(message) }),
      uuid: uuid,
    },
  });
}

async function main(db_name, ou_id, messageText) {
  const supabase = createClient(
    "https://srvzxxoazxabhutjutbk.supabase.co",
    process.env.SERVICE_KEY
  );

  let { data: resSeclect, error: errSeclect } = await supabase
    .from(db_name)
    .select("full_name, open_id, lark_app_id, lark_app_secret")
    .eq("open_id", ou_id)
    .single();

  const larkClient = new lark.Client({
    appId: resSeclect.lark_app_id,
    appSecret: resSeclect.lark_app_secret,
    disableTokenCache: false,
    domain: lark.Domain.Lark,
  });

  await sendDM(larkClient, resSeclect.open_id, messageText);
  console.log(
    `Message sent to ${resSeclect.full_name} - (${resSeclect.open_id}) - messageText: ${messageText}`
  );
}

const ou_id = process.env.OU_ID;
const db_name = process.env.DB_NAME;
const messageText = process.env.MESSAGE_TEXT;

main(db_name, ou_id, messageText);
