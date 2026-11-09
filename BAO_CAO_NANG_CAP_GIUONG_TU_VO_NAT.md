# Click91 — Làm mới hình ảnh giường và tủ bị Liệp Ma phá

## Phạm vi

- Dựa trên bản `Click91_Fix_Liep_Ma_Pha_Giuong_Tu.zip`.
- Thay thế `public/game/giuong_pha_huy.webp` và `public/game/tu_quan_ao_pha_huy.webp` bằng sprite dựng mới, giữ đúng 6 khung ngang, mỗi khung 160 × 160 px, nền trong suốt.
- Căn lại tâm các khung để giảm cảm giác giật, giữ đúng vị trí vẽ và va chạm trong phòng Tiểu Phàm.
- Đổi phiên bản URL tài nguyên trong `public/game/tieu-pham-home.js` thành `?v=fur3` để tránh trình duyệt dùng ảnh cũ đã lưu trong cache.
- Cập nhật thông tin trạng thái của `public/game/pha_huy_animations.json`.

## Không thay đổi

- Kịch bản Liệp Ma đánh giường rồi đánh tủ, thời điểm đồ vật chuyển sang vỡ.
- Cơ chế nấp chum, giường, tủ; các hệ thống lưu/tải; những nhiệm vụ và khu nghĩa trang đã chỉnh ở bản trước.

## Xác minh

- Đã kiểm tra kích thước, số lượng 6 khung và độ trong suốt của cả hai spritesheet.
- Đã chạy `npm test` trên mã nguồn sửa đổi, kết quả thành công (exit code 0), trong đó bao gồm các bài kiểm thử Nhiệm vụ 2.
- Đã xuất ảnh so sánh trước/sau riêng: `Click91_Giuong_Tu_Truoc_Sau.png` (ngoài ZIP).
- Chưa kiểm thử thao tác người chơi trên Android thật.
