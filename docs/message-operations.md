# Chi tiết các Node và Lark API

## Bảng ánh xạ

| Node                | Workflow                       | Input nghiệp vụ                                      | Lark SDK                   | HTTP Lark                                                |
| ------------------- | ------------------------------ | ---------------------------------------------------- | -------------------------- | -------------------------------------------------------- |
| `send_dm.js`        | `send-message-workflow-v2.yml` | `OU_ID`, `TITLE`, `MESSAGE_TEXT`                     | `client.im.message.create` | `POST /open-apis/im/v1/messages?receive_id_type=open_id` |
| `send_group.js`     | `send-message-group.yml`       | `CHAT_ID`, `TITLE`, `MESSAGE_TEXT`                   | `client.im.message.create` | `POST /open-apis/im/v1/messages?receive_id_type=chat_id` |
| `edit_message.js`   | `edit-message-workflow.yml`    | `open_id`, `message_id`, `title`, `new_message_text` | `client.im.message.update` | `PUT /open-apis/im/v1/messages/:message_id`              |
| `recall_message.js` | `recall-message-workflow.yml`  | `open_id`, `message_id`                              | `client.im.message.delete` | `DELETE /open-apis/im/v1/messages/:message_id`           |

## `send_dm.js`

Mục đích: gửi một rich-text message trực tiếp đến người dùng.

Luồng xử lý:

1. Nhận `OU_ID`, `TITLE`, `MESSAGE_TEXT` từ environment.
2. Tìm người dùng và assistant app theo `open_id` trong PostgreSQL.
3. Chuyển nội dung thành Lark `post` blocks.
4. Tạo UUID chống gửi trùng trong khoảng thời gian Lark áp dụng idempotency.
5. Gọi Create message với `receive_id_type=open_id`.
6. Log `response.data.message_id` và ghi `message_id` vào `$GITHUB_OUTPUT`.

Lưu ý: tên input workflow là `OU_ID`, nhưng giá trị thực tế phải là Lark `open_id` có dạng `ou_...`.

## `send_group.js`

Mục đích: gửi một rich-text message vào nhóm.

Luồng xử lý:

1. Nhận `CHAT_ID`, `TITLE`, `MESSAGE_TEXT` và `DB_CHAT_NAME`.
2. Kiểm tra tên bảng `DB_CHAT_NAME`.
3. Tìm group/app credentials theo `chat_id`.
4. Gọi Create message với `receive_id_type=chat_id`.
5. Log và xuất `message_id` cho callback job.

Bot tương ứng phải đang nằm trong nhóm `CHAT_ID`.

## `edit_message.js`

Mục đích: thay toàn bộ title và body của một rich-text message đã gửi.

Luồng xử lý:

1. Nhận `OPEN_ID`, `MESSAGE_ID`, `TITLE`, `NEW_MESSAGE_TEXT` từ workflow.
2. Dùng `OPEN_ID` tìm assistant app; `OPEN_ID` không được gửi vào endpoint update.
3. Tạo lại toàn bộ payload `post` gồm `en_us.title` và `en_us.content`.
4. Gọi Update message bằng `MESSAGE_ID`.

`TITLE` bắt buộc vì Update message thay toàn bộ nội dung. Không truyền title cũ sẽ làm title biến mất. App được tìm theo `OPEN_ID` phải chính là app đã gửi tin nhắn.

## `recall_message.js`

Mục đích: thu hồi một tin nhắn.

Luồng xử lý:

1. Nhận `OPEN_ID`, `MESSAGE_ID`.
2. Dùng `OPEN_ID` tìm assistant app.
3. Gọi Delete message với `MESSAGE_ID`.
4. Nếu `code === 0`, log ID đã thu hồi.

Lark gọi thao tác này là Delete message ở API/SDK nhưng hành vi phía người dùng là recall/thu hồi.

## Định dạng nội dung

Ba Node có xử lý nội dung `post` đang hỗ trợ:

| Input      | Kết quả                              |
| ---------- | ------------------------------------ |
| `**text**` | Bold                                 |
| `~~text~~` | Bold theo logic hiện tại của project |
| `~*text*~` | Bold + italic                        |
| Dòng trống | Một paragraph xuống dòng             |

Đây không phải bộ phân tích Markdown đầy đủ. Link, ảnh, danh sách, code block và các cấu trúc Markdown khác chưa được chuyển đổi chuyên biệt.

## Tài liệu Lark

- [Create message](https://open.larksuite.com/document/server-docs/im-v1/message/create)
- [Update message](https://open.larksuite.com/document/server-docs/im-v1/message/update)
- [Delete/recall message](https://open.larksuite.com/document/server-docs/im-v1/message/delete)
- [Message content structure](https://open.larksuite.com/document/server-docs/im-v1/message-content-description/create_json)
