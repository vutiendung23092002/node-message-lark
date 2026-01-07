import * as lark from "@larksuiteoapi/node-sdk";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

// function mdToLarkPostBlocks(message) {
//   const lines = message.split("\n");
//   return lines.map((line) => {
//     if (!line.trim()) return [{ tag: "text", text: "\n" }];
//     const parts = line
//       .split(/(\*\*.*?\*\*)/gs)
//       .filter(Boolean)
//       .map((part) => {
//         if (part.startsWith("**") && part.endsWith("**")) {
//           return { tag: "text", text: part.slice(2, -2), style: ["bold"] };
//         }
//         return { tag: "text", text: part };
//       });
//     return parts;
//   });
// }

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
        return { tag: "text", text: part.slice(2, -2), style: ["bold", "italic"] };
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

async function main(db_name, ou_id, title, messageText) {
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

  await sendDM(larkClient, resSeclect.open_id, title, messageText);
  console.log(
    `Message sent to ${resSeclect.full_name} - (${resSeclect.open_id}) - messageText: ${messageText}`
  );
}

const ou_id = process.env.OU_ID;
const db_name = process.env.DB_NAME;
const messageText = process.env.MESSAGE_TEXT;
const title = process.env.TITLE;

main(db_name, ou_id, title, messageText);
