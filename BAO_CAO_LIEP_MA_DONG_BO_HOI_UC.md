# Liệp Ma — phiên bản sprite đồng bộ hồi ức

## Mục tiêu
Giữ cùng một con Liệp Ma như trong ảnh `public/game/webp/05.webp` và `07.webp`:
- bờm đen rối, lưng gù cao, thân lực lưỡng;
- đầu sói / mõm dài, hai mắt đỏ nhỏ;
- tay dài và móng vuốt cong, bàn chân bấu mặt đất.

Không dùng phương án concept mặt trắng hoặc tạo loài quái khác.

## Những thay đổi thật sự
- Dùng chính 48 khung trong sprite gốc làm nguồn, không tạo nhân vật khác.
- Tái bố trí khung gù thấp từ nguồn gốc cho 3 động tác `idle`, `walk`, `sniff`, giữ 4 nhóm đánh/nhận đòn/chết từ nguyên mẫu.
- Đồng bộ lại sắc độ và bảng màu, giảm hạt nhiễu bằng bộ màu dùng chung 54 màu, xử lý sắc thái tối và nét viền pixel.
- Giữ spritesheet 1152×1536 px, mỗi frame 192×192 px, 6 cột × 8 hàng, nền trong suốt.
- Nhịp đi trong nhà giảm tốc; các lần tiến từ giường sang tủ và từ tủ sang chum được kéo giãn cho hợp bước đi thấp.
- Định vị ánh mắt đỏ theo đầu ở từng khung, không dùng điểm sáng lơ lửng; hơi thở cũng đi theo đầu.
- Cắt lại vùng cửa sổ khi Liệp Ma xuất hiện để hình thể không bị cắt mất mặt.
- Giữ cơ chế giường/tủ chỉ vỡ khi móng vuốt thực sự đánh trúng, không phá chum nước.
- Ảnh hồi ức `05.webp`, `07.webp` **giữ nguyên tuyệt đối**.

## File chính thay đổi
- `public/game/liep-ma/liep-ma-sprites.webp`
- `public/game/liep-ma/animations.json`
- `public/game/quest2.js`
- `public/game/quest2-render.js`
- `tests/quest2.cjs` và `tests/quest-fixes.cjs` (mốc thời gian mới)

## Kiểm thử
- `npm test --silent`: PASS toàn bộ bộ kiểm thử mã nguồn hiện có.
- Nhiệm vụ 2: 12/12 PASS, gồm nhánh chum, giường, tủ, tử vong, bình minh.
- Kiểm tra tất cả 48 khung đủ nội dung, không rỗng, kích thước và alpha đúng.
- Không thay đổi dữ liệu gốc của ảnh hồi ức.
- Chromium trong phiên này không cho phép mở trang thử nghiệm cục bộ (ERR_BLOCKED_BY_ADMINISTRATOR), vì vậy chưa xác minh trải nghiệm hiển thị trực tiếp trên trình duyệt thật hoặc joystick Android.
