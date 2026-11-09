# Cập nhật nhiệm vụ 3 — An Táng Cố Nhân

## Vấn đề đã xử lý
- Bố trí mộ cũ: 52 ụ đất cỡ vài pixel, bước ngang 19, bước dọc 20 ở vị trí cạnh lối chính x ~500-640, chật và khó nhận biết.
- Bố trí mới: nghĩa trang bên phía tây cây anh đào, 52 ngôi mộ trong hai dãy 4 cột, có lối đi giữa x ~296, khoảng cách giữa tâm mộ tối thiểu 32 đơn vị.
- Đồ họa: WebP sprite sheet 3 biến thể bia mộ (5.6 KB), nấm đất, bia gỗ có chi tiết, cánh hoa đào và nền đất tưởng niệm đã cache.
- Tường/vườn bị phá trong ảnh nền được phủ bởi nền đất nghĩa trang khi đã an táng, tránh hàng rào đâm xuyên mộ.
- Camera khi lại gần và đã nhặt ruy băng: điều chỉnh khung hình rộng hơn trên màn hình dọc để nhìn rõ cả khu mộ.
- Thứ tự lớp vẽ: lớp đất và bia mộ vẽ trước nhân vật, cánh hoa vẽ sau; không che Tiểu Phàm.
- Va chạm: mỗi ngôi mộ có hitbox nhỏ, lối đi chính tới cổng (x=690) và khoảng đứng quỳ (505,745) không bị chặn.

## Giữ nguyên
- Số mộ 52, tên NPC và 28 mộ tưởng niệm, không tạo mộ A Nguyệt.
- Chuỗi comic 15.webp, 16.webp và tiến trình 3->4->5, cờ nhiệm vụ và lưu/tải.
- Các phần đồ họa/nhiệm vụ khác.

## File thay đổi
- public/game/quest3.js
- public/game/game.js
- public/game/mo_co_nhan_sheet.webp (thêm)
- tests/quest3.cjs (kiểm tra thêm khoảng cách mộ, va chạm, camera, asset)

## Kiểm thử
- node --check quest3.js và game.js: đạt.
- npm test: tất cả bài kiểm thử hoàn tất.
- Dựng xem trước bằng Chromium: 52 mộ hiện đúng từ mã Canvas, không lỗi JavaScript khi vẽ.
