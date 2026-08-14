# Cấu hình môi trường và cơ sở dữ liệu

## GitHub Environment

Tất cả workflow đang dùng environment có tên:

```text
environment-production
```

Vào repository GitHub, mở **Settings → Environments → environment-production** và cấu hình:

| Loại     | Tên                          | Bắt buộc                         | Sử dụng bởi                                                 |
| -------- | ---------------------------- | -------------------------------- | ----------------------------------------------------------- |
| Secret   | `DATABASE_URL`               | Có                               | Tất cả Node                                                 |
| Secret   | `CALLBACK_URL`               | Có                               | Tất cả callback job                                         |
| Variable | `DB_CHAT_NAME`               | Có cho gửi nhóm                  | `send_group.js`                                             |
| Secret   | `AES_256_CBC_APP_SECRET_KEY` | Không được code hiện tại sử dụng | Đang được truyền vào workflow DM để tương thích cấu hình cũ |

Ví dụ `DATABASE_URL`:

```text
postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

Không commit `.env`, database password, Lark app secret hoặc GitHub token vào repository.

## Cấu trúc dữ liệu cho DM

`send_dm.js` tìm assistant app theo `open_id`:

```sql
select
  u.name,
  u.open_id,
  a.app_id as app_id_trolyhan,
  a.app_secret as app_secret_trolyhan
from han_hrm.users u
join han_hrm.apps a
  on a.org_id = u.org_id
 and a.type = 'assistant'
where u.open_id = $1
limit 1;
```

Yêu cầu dữ liệu:

- `han_hrm.users`: có `name`, `open_id`, `org_id`.
- `han_hrm.apps`: có `org_id`, `type`, `app_id`, `app_secret`.
- Mỗi tổ chức cần app loại `assistant` tương ứng.
- `open_id` dùng trong input phải tồn tại trong `han_hrm.users`.

## Cấu trúc dữ liệu cho edit và recall

`edit_message.js` và `recall_message.js` tìm assistant app theo `union_id`:

```sql
select
  u.name,
  u.union_id,
  a.app_id as app_id_trolyhan,
  a.app_secret as app_secret_trolyhan
from han_hrm.users u
join han_hrm.apps a
  on a.org_id = u.org_id
 and a.type = 'assistant'
where u.union_id = $1
limit 1;
```

Yêu cầu `han_hrm.users` có cột `union_id` và giá trị input phải tồn tại trong cột này. Edit và recall cần tìm đúng app đã gửi `message_id`. Nếu dùng `union_id` thuộc một tổ chức/app khác, Lark sẽ từ chối thao tác.

Theo Lark, `union_id` giữ nguyên cho cùng một người dùng giữa các app do cùng một developer/provider phát triển. Database hiện có unique constraint cho `han_hrm.users.union_id`, vì vậy phù hợp để tìm duy nhất người dùng và assistant app. Nếu các app thuộc developer/provider khác nhau thì không thể dùng chung `union_id`.

## Cấu trúc dữ liệu cho gửi nhóm

Tên bảng lấy từ GitHub variable `DB_CHAT_NAME`. Node chỉ chấp nhận tên bảng khớp biểu thức:

```text
^[a-zA-Z_][a-zA-Z0-9_]*$
```

Bảng nằm trong schema `public` và cần các cột:

| Cột                   | Ý nghĩa                   |
| --------------------- | ------------------------- |
| `name`                | Tên nhóm                  |
| `chat_id`             | Lark chat ID              |
| `app_id_trolyhan`     | App ID của bot trong nhóm |
| `app_secret_trolyhan` | App secret của bot        |

Truy vấn được dùng:

```sql
select name, chat_id, app_id_trolyhan, app_secret_trolyhan
from public."<DB_CHAT_NAME>"
where chat_id = $1
limit 1;
```

## Cấu hình Lark app

Mỗi app cần:

- Bật bot capability và publish phiên bản có cấu hình mới.
- Có availability đối với người dùng nhận DM.
- Được thêm vào nhóm và có quyền gửi tin đối với group message.
- Có quyền gửi tin cho create message.
- Có quyền update message cho edit.
- Có quyền recall/delete message cho recall.

Chi tiết quyền phụ thuộc loại app và tenant; kiểm tra trực tiếp tại Lark Developer Console và tài liệu API tương ứng.

## Chạy cục bộ

Cài dependency:

```bash
npm ci
```

Tạo `.env` cục bộ, ví dụ:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
DB_CHAT_NAME=lark_groups
CHAT_ID=oc_xxx
OU_ID=ou_xxx
UNION_ID=on_xxx
MESSAGE_ID=om_xxx
TITLE=Thông báo
MESSAGE_TEXT=Nội dung gửi mới
NEW_MESSAGE_TEXT=Nội dung sau khi sửa
```

Chạy Node mong muốn:

```bash
node send_dm.js
node send_group.js
node edit_message.js
node recall_message.js
```

Khi chạy ngoài GitHub Actions, biến `GITHUB_OUTPUT` không tồn tại nên các Node gửi tin chỉ log `message_id`, không ghi job output. `CALLBACK_URL` chỉ được workflow gọi, không được Node gọi trực tiếp.
