# Báo cáo dọn dẹp Click91

- Giữ nguyên toàn bộ mã nguồn gameplay (`public/game/*.js`), React/Vite, nhiệm vụ 1–3, âm thanh và bài kiểm thử.
- Xóa kho media tạm trong `.aistudio/artifacts` (không tham gia build/game runtime).
- Xóa các bản sao dữ liệu/ảnh ở thư mục gốc khi file hoạt động tương ứng vẫn nằm trong `public/game`.
- Xóa các bản sao vật dụng tại `public/` khi game sử dụng bản nằm trong `public/game/`.
- Xóa ảnh screenshot và ảnh tham chiếu `src/assets/images` không được import hoặc sử dụng trong game.
- Giữ `public/game/liep-ma/liep-ma-preview.gif` và tài nguyên khác để không làm mất nội dung kiểm thử/tham chiếu.
- Không tái cấu trúc hoặc xóa những hàm có thể được gọi động bởi HTML và hệ thống canvas.

## Danh sách xóa
- `.aistudio/artifacts` (7,017,706 bytes)
- `ban_va_nen` (25,003 bytes)
- `bep_lo` (42,571 bytes)
- `sap_quan_ao` (29,158 bytes)
- `webp` (1,148,110 bytes)
- `chum_nuoc_sheet.webp` (22,866 bytes)
- `giuong_sheet.webp` (33,880 bytes)
- `giuong_pha_huy.webp` (53,844 bytes)
- `tu_quan_ao_sheet.webp` (28,912 bytes)
- `tu_quan_ao_pha_huy.webp` (51,536 bytes)
- `noi-that-animation.json` (1,573 bytes)
- `pha_huy_animations.json` (1,127 bytes)
- `scene_sequence.json` (4,043 bytes)
- `public/chum_nuoc_sheet.webp` (22,866 bytes)
- `public/giuong_sheet.webp` (33,880 bytes)
- `public/giuong_pha_huy.webp` (53,844 bytes)
- `public/tu_quan_ao_sheet.webp` (28,912 bytes)
- `public/tu_quan_ao_pha_huy.webp` (51,536 bytes)
- `src/assets/images/seamless_river_bridge_join_1794118236339.jpg` (739,902 bytes)
- `public/assets/aistudio/Screenshot_20261108_130022_e4744388.jpg` (900,042 bytes)
- `Xem_Truoc_17_Canh.jpg` (308,829 bytes)
