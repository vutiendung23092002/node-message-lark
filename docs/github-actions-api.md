# Gọi workflow bằng GitHub REST API

## Endpoint chung

```text
POST https://api.github.com/repos/vutiendung23092002/node-message-lark/actions/workflows/{workflow_file}/dispatches
```

Headers:

```http
Accept: application/vnd.github+json
Authorization: Bearer <GITHUB_TOKEN>
X-GitHub-Api-Version: 2026-03-10
Content-Type: application/json
```

Body luôn có:

```json
{
  "ref": "main",
  "return_run_details": true,
  "inputs": {}
}
```

`ref` là branch hoặc tag chứa phiên bản workflow cần chạy. File workflow phải tồn tại trên default branch thì mới nhận được sự kiện `workflow_dispatch`.

Token được khuyến nghị là fine-grained PAT hoặc GitHub App installation token, giới hạn cho repository này và có repository permission **Actions: write**. PAT classic cần scope `repo` đối với private repository.

Khi `return_run_details` là `true`, GitHub có thể trả `workflow_run_id`, `run_url` và `html_url`. Đây chỉ là thông tin workflow run, không phải kết quả Lark. Kết quả cuối đến qua callback.

Tài liệu chính thức: [Create a workflow dispatch event](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event).

## 1. Gửi DM

Workflow:

```text
send-message-workflow-v2.yml
```

Inputs:

| Field          | Bắt buộc            | Mô tả                 |
| -------------- | ------------------- | --------------------- |
| `request_id`   | Có                  | ID đối chiếu callback |
| `OU_ID`        | Có                  | Lark open ID `ou_...` |
| `MESSAGE_TEXT` | Có                  | Nội dung tin nhắn     |
| `TITLE`        | Không theo workflow | Tiêu đề rich-text     |

```bash
curl -L --fail-with-body \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  https://api.github.com/repos/vutiendung23092002/node-message-lark/actions/workflows/send-message-workflow-v2.yml/dispatches \
  -d '{
    "ref": "main",
    "return_run_details": true,
    "inputs": {
      "request_id": "req-dm-001",
      "OU_ID": "ou_xxx",
      "TITLE": "Thông báo",
      "MESSAGE_TEXT": "Xin chào **bạn**"
    }
  }'
```

## 2. Gửi tin nhắn nhóm

Workflow:

```text
send-message-group.yml
```

Inputs:

| Field          | Bắt buộc            | Mô tả                       |
| -------------- | ------------------- | --------------------------- |
| `request_id`   | Có                  | ID đối chiếu callback       |
| `CHAT_ID`      | Có                  | Lark group chat ID `oc_...` |
| `MESSAGE_TEXT` | Có                  | Nội dung tin nhắn           |
| `TITLE`        | Không theo workflow | Tiêu đề rich-text           |

```bash
curl -L --fail-with-body \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  https://api.github.com/repos/vutiendung23092002/node-message-lark/actions/workflows/send-message-group.yml/dispatches \
  -d '{
    "ref": "main",
    "return_run_details": true,
    "inputs": {
      "request_id": "req-group-001",
      "CHAT_ID": "oc_xxx",
      "TITLE": "Thông báo nhóm",
      "MESSAGE_TEXT": "Nội dung gửi vào nhóm"
    }
  }'
```

## 3. Chỉnh sửa tin nhắn

Workflow:

```text
edit-message-workflow.yml
```

Inputs:

| Field              | Bắt buộc | Mô tả                           |
| ------------------ | -------- | ------------------------------- |
| `request_id`       | Có       | ID đối chiếu callback           |
| `open_id`          | Có       | Dùng để tìm đúng assistant app  |
| `message_id`       | Có       | Tin nhắn cần sửa, dạng `om_...` |
| `title`            | Có       | Tiêu đề cần giữ hoặc thay thế   |
| `new_message_text` | Có       | Nội dung mới                    |

```bash
curl -L --fail-with-body \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  https://api.github.com/repos/vutiendung23092002/node-message-lark/actions/workflows/edit-message-workflow.yml/dispatches \
  -d '{
    "ref": "main",
    "return_run_details": true,
    "inputs": {
      "request_id": "req-edit-001",
      "open_id": "ou_xxx",
      "message_id": "om_xxx",
      "title": "Thông báo",
      "new_message_text": "Nội dung đã chỉnh sửa"
    }
  }'
```

## 4. Thu hồi tin nhắn

Workflow:

```text
recall-message-workflow.yml
```

Inputs:

| Field        | Bắt buộc | Mô tả                               |
| ------------ | -------- | ----------------------------------- |
| `request_id` | Có       | ID đối chiếu callback               |
| `open_id`    | Có       | Dùng để tìm đúng assistant app      |
| `message_id` | Có       | Tin nhắn cần thu hồi, dạng `om_...` |

```bash
curl -L --fail-with-body \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  https://api.github.com/repos/vutiendung23092002/node-message-lark/actions/workflows/recall-message-workflow.yml/dispatches \
  -d '{
    "ref": "main",
    "return_run_details": true,
    "inputs": {
      "request_id": "req-recall-001",
      "open_id": "ou_xxx",
      "message_id": "om_xxx"
    }
  }'
```

## Gọi bằng JavaScript

```js
async function dispatchLarkWorkflow(workflowFile, inputs) {
  const response = await fetch(
    `https://api.github.com/repos/vutiendung23092002/node-message-lark/actions/workflows/${workflowFile}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2026-03-10",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        return_run_details: true,
        inputs,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `GitHub dispatch failed: ${response.status} ${await response.text()}`,
    );
  }

  return response.status === 204 ? null : response.json();
}
```

Không đưa `GITHUB_TOKEN` vào frontend hoặc ứng dụng client. Việc dispatch phải thực hiện ở backend đáng tin cậy.

## Lỗi thường gặp

| HTTP/kết quả                                 | Nguyên nhân thường gặp                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `401`                                        | Token thiếu, sai hoặc hết hạn                                                                          |
| `403`                                        | Token thiếu quyền Actions write hoặc repository policy chặn                                            |
| `404`                                        | Sai owner/repo/workflow file, token không thấy private repo, hoặc workflow chưa có trên default branch |
| `422`                                        | Sai `ref`, thiếu input bắt buộc hoặc tên input không khớp                                              |
| Dispatch thành công nhưng callback `failure` | Lỗi database, không tìm thấy app/receiver, thiếu quyền Lark hoặc Lark từ chối request                  |

Tên input phân biệt hoa/thường. Hai workflow gửi dùng `OU_ID`, `CHAT_ID`, `TITLE`, `MESSAGE_TEXT`; edit và recall dùng input viết thường như định nghĩa ở trên.
