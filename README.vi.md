# Tiện ích i18n Google Sheet

Tiện ích VS Code giúp đồng bộ các bản dịch giữa Google Sheets và file JSON. Tiện ích này giúp bạn quản lý các bản dịch của ứng dụng bằng cách sử dụng Google Sheets như một công cụ quản lý trung tâm.

## Tính năng

- **Đồng bộ hai chiều**: Đồng bộ bản dịch giữa Google Sheets và file JSON theo cả hai hướng
- **Hỗ trợ đa ngôn ngữ**: Xử lý nhiều ngôn ngữ và file dịch
- **Xác thực an toàn**: Sử dụng OAuth 2.0 để truy cập Google Sheets an toàn
- **Theo dõi tiến trình**: Hiển thị trực quan tiến trình trong quá trình đồng bộ
- **Xử lý lỗi**: Xử lý lỗi toàn diện và phản hồi người dùng

## Yêu cầu trước khi sử dụng

Trước khi sử dụng tiện ích, bạn cần:

1. Tạo một Google Cloud Project
2. Bật Google Sheets API
3. Tạo thông tin xác thực OAuth 2.0 (Ứng dụng Desktop)
4. Chuẩn bị sẵn một Google Sheet

### Thiết lập Google Cloud Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Bật Google Sheets API:
   - Vào "APIs & Services" > "Library"
   - Tìm kiếm "Google Sheets API"
   - Nhấn "Enable"
4. Tạo thông tin xác thực OAuth:
   - Vào "APIs & Services" > "Credentials"
   - Nhấn "Create Credentials" > "OAuth client ID"
   - Chọn "Desktop application"
   - Đặt tên (ví dụ: "i18n Translation Tool")
   - Lưu lại Client ID và Client Secret

### Chuẩn bị Google Sheet

1. Tạo một Google Sheet mới
2. Thiết lập cấu trúc sheet như sau:
   - Cột đầu tiên phải có tiêu đề là "key"
   - Các cột tiếp theo là mã ngôn ngữ (ví dụ: "en", "vi", "fr")
   - Mỗi hàng đại diện cho một khóa dịch và giá trị của nó

Ví dụ cấu trúc sheet:
| key | en | vi | fr |
|-----|----|----|----| 
| welcome | Welcome | Xin chào | Bienvenue |
| goodbye | Goodbye | Tạm biệt | Au revoir |

## Cài đặt

1. Mở VS Code
2. Vào phần Extensions (Ctrl+Shift+X)
3. Tìm kiếm "i18n Google Sheet"
4. Nhấn Install

## Sử dụng

### Thiết lập ban đầu

1. Mở Command Palette (Ctrl+Shift+P)
2. Chạy lệnh "I18n Google Sheet: Setup"
3. Nhập các thông tin yêu cầu:
   - Google Sheet ID (lấy từ URL của sheet)
   - Client ID (từ thông tin xác thực Desktop application)
   - Client Secret (từ thông tin xác thực Desktop application)
4. Hoàn thành quá trình xác thực OAuth:
   - Trình duyệt sẽ mở ra để xác thực với Google
   - Đăng nhập tài khoản Google
   - Cấp quyền truy cập
   - Mã xác thực sẽ tự động được điền vào VS Code
   - Nhấn Enter để xác nhận mã

### Đồng bộ từ Google Sheets sang JSON

1. Mở Command Palette
2. Chạy lệnh "I18n Google Sheet: Sync from Google Sheets to JSON"
3. Đợi quá trình đồng bộ hoàn tất
4. Các file JSON sẽ được tạo trong thư mục `locales`

### Đồng bộ từ JSON lên Google Sheets

1. Mở Command Palette
2. Chạy lệnh "I18n Google Sheet: Sync from JSON to Google Sheets"
3. Đợi quá trình đồng bộ hoàn tất
4. Google Sheet của bạn sẽ được cập nhật với các bản dịch mới nhất

## Cấu trúc thư mục

Tiện ích sẽ tạo và duy trì cấu trúc sau trong dự án của bạn:

## Đóng góp

Chúng tôi rất hoan nghênh mọi đóng góp! Vui lòng tạo Pull Request nếu bạn muốn đóng góp.

## Giấy phép

Dự án này được cấp phép theo giấy phép MIT - xem file LICENSE để biết thêm chi tiết.