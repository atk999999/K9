# Làng Du Lãm — Huyết Dạ Yêu Ảnh (v1.9.0)

Game nhập vai 2D cổ phong Làng Du Lãm — Tuổi thơ và Tiên Duyên Khởi Đầu của thiếu niên Trương Tiểu Phàm, lời hẹn ước cùng A Nguyệt dưới giàn hoa Xóm Đông, và đêm sinh tồn nghẹt thở trước sự tấn công của Liệp Ma.

## Chạy và Kiểm thử
Yêu cầu Node.js 20.19+ hoặc 22.12+:
```sh
npm install
npm run dev
```
- `npm run build`: Đóng gói bản production.
- `npm test`: Chạy toàn bộ 20 bộ kiểm thử tự động trong `tests/*.cjs`.
- `npm run lint`: Chạy bộ kiểm thử nhanh các tính năng cốt lõi.

## Cấu trúc thư mục
- `public/game/`: Toàn bộ engine 2D Canvas, kịch bản nhiệm vụ, NPC, hệ thống thời tiết/ánh sáng và tài nguyên âm thanh/hình ảnh chuẩn.
  - Nhạc nền 3 giai đoạn (`music.js`):
    - `01_Lang_Du_Lam_Mot_Ngay_Binh_Yen.ogg` / `.mp3`: Nhạc nền Làng Du Lãm thanh bình.
    - `Nhac_Dem_Liep_Ma.ogg`: Nhạc nền căng thẳng chỉ phát trong đêm sự kiện Liệp Ma (`00:00` – trước `06:00`).
    - `Loi_Hen_Cat_10s_Can_Bang.ogg`: Nhạc nền bi thương phát từ bình minh (`06:00`) khi Làng Du Lãm hóa thành phế tích.
- `src/`: Vỏ ứng dụng React nhúng `public/game/index.html`.
- `docs/`: Tài liệu cốt truyện Nhiệm vụ 1 và ngoại truyện *Lời Hẹn Dưới Giàn Hoa*.
- `tests/`: 20 bộ kiểm thử hồi quy bảo vệ toàn bộ tính năng.
