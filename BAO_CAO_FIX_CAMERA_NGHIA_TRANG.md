# S9 — Sửa nhảy khung hình khi đi qua nghĩa trang

## Nguyên nhân
`Quest3.getMemorialFraming()` chuyển giữa chế độ ngắm mộ và camera thông thường ngay tại khoảng cách 210 đơn vị. `game.js` đồng thời thay đổi đột ngột tâm camera và mức zoom, khiến map và Tiểu Phàm nhảy vị trí/kích thước trên màn hình.

## Đã sửa
- `public/game/quest3.js`: bật khung mộ khi cách điểm mộ không quá 210 đơn vị; chỉ tắt khi từ 270 đơn vị trở lên (vùng đệm tránh nhấp nháy); xóa trạng thái khi bắt đầu lại.
- `public/game/game.js`: nội suy tâm camera và mức zoom theo thời gian khung hình, dịch nhẹ khi nhân vật ra sát mép vùng nghĩa trang, căn chỉnh offset theo pixel vật lý; đặt lại nội suy khi chuyển sang trong nhà, dịch chuyển tức thời, thay đổi chế độ toàn cảnh hoặc đổi kích thước màn hình.
- Không sửa ảnh WebP, hoạt ảnh nhân vật, hitbox, sự kiện cốt truyện hoặc định dạng dữ liệu lưu.
- `tests/camera-nghia-trang.cjs`: thêm kiểm thử vùng đệm và zoom mượt ở 60 FPS.

## Kiểm tra
- `node --check` cho `game.js` và `quest3.js`: đạt.
- `npm test`: toàn bộ bài kiểm thử có sẵn và bài kiểm thử mới đều đạt.
- Chưa kiểm thử thao tác thực tế trên thiết bị Android; cần kiểm tra trực quan khi đi vào/ra khu mộ.

## Cập nhật trên Termux
Giữ nguyên tên thư mục `Click91-main`. Giải nén đè các file của ZIP mới vào thư mục S9 để giữ cấu trúc dự án. Lưu game trong Chrome không nằm trong ZIP nên không bị ghi đè khi cập nhật mã nguồn.
