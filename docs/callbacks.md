# Payload callback

## Nguyên tắc chung

Sau job nghiệp vụ, workflow gửi một HTTP `POST` tới secret `CALLBACK_URL` với header:

```http
Content-Type: application/json
```

Các trường chung:

| Field         | Kiểu   | Ý nghĩa                                                                 |
| ------------- | ------ | ----------------------------------------------------------------------- |
| `request_id`  | string | ID do hệ thống gọi truyền vào                                           |
| `job_id`      | string | Tên logic/workflow do callback khai báo                                 |
| `conclusion`  | string | Kết quả job: thường là `success`, `failure`, `cancelled` hoặc `skipped` |
| `type`        | string | `send`, `edit` hoặc `recall`                                            |
| `receiver_id` | string | `open_id`, `union_id` hoặc `chat_id` được dùng trong request            |
| `message_id`  | string | ID tin nhắn Lark                                                        |

Callback job dùng `if: always()`, vì vậy endpoint phải xử lý cả callback thành công và thất bại.

## Callback gửi DM

```json
{
  "request_id": "req-dm-001",
  "job_id": "send-message-workflow-v2.yml",
  "conclusion": "success",
  "type": "send",
  "title": "Thông báo",
  "receiver_id": "ou_xxx",
  "message_text": "Nội dung tin nhắn",
  "message_id": "om_xxx"
}
```

## Callback gửi nhóm

```json
{
  "request_id": "req-group-001",
  "job_id": "send-group-workflow.yml",
  "conclusion": "success",
  "type": "send",
  "title": "Thông báo nhóm",
  "receiver_id": "oc_xxx",
  "message_text": "Nội dung tin nhắn",
  "message_id": "om_xxx"
}
```

Lưu ý: theo implementation hiện tại, giá trị `job_id` của callback nhóm là `send-group-workflow.yml`, trong khi tên file workflow thực tế là `send-message-group.yml`. Consumer nên dựa chủ yếu vào `type` và `request_id`, hoặc hỗ trợ đúng giá trị hiện tại này.

## Callback chỉnh sửa

```json
{
  "request_id": "req-edit-001",
  "job_id": "edit-message-workflow.yml",
  "conclusion": "success",
  "type": "edit",
  "receiver_id": "on_xxx",
  "message_id": "om_xxx",
  "title": "Thông báo",
  "message_text": "Nội dung đã chỉnh sửa"
}
```

## Callback thu hồi

```json
{
  "request_id": "req-recall-001",
  "job_id": "recall-message-workflow.yml",
  "conclusion": "success",
  "type": "recall",
  "receiver_id": "on_xxx",
  "message_id": "om_xxx"
}
```

## Xử lý callback đề xuất

1. Kiểm tra JSON hợp lệ.
2. Tìm request ban đầu bằng `request_id`.
3. Kiểm tra `type` để chọn nghiệp vụ.
4. Nếu `conclusion === "success"`, lưu `message_id` và đánh dấu hoàn tất.
5. Nếu không thành công, lưu trạng thái lỗi và dùng GitHub run/log để điều tra.
6. Trả HTTP `2xx` nhanh chóng.

Callback có thể được gửi lại khi workflow được rerun. Handler nên idempotent theo cặp `request_id` + `type`, hoặc lưu lịch sử attempt nếu hệ thống cần theo dõi nhiều lần chạy.

## Lưu ý bảo mật

Implementation hiện tại không đính kèm chữ ký hoặc authorization header vào callback. Không nên coi payload là đáng tin chỉ vì nó có `request_id`. Tối thiểu cần:

- Dùng URL callback khó đoán và chỉ lưu trong GitHub Secret.
- Chỉ sử dụng HTTPS.
- Không log secret URL.
- Nếu cần xác thực mạnh, bổ sung shared secret/signature header ở một thay đổi riêng.

Lệnh `curl` callback hiện tại không dùng tùy chọn `--fail-with-body`; HTTP `4xx/5xx` từ callback server có thể không làm step thất bại nếu kết nối vẫn thành công. Consumer nên giám sát request nhận được và phản hồi rõ ràng.
