# Lời Hẹn Dưới Giàn Hoa – A Nguyệt

**Vị trí:** Nhiệm vụ xen giữa *Tiên Duyên Khởi Đầu* và *Huyết Dạ Yêu Ảnh*.

## Cách chơi

1. Hoàn thành buổi khảo nghiệm linh căn, để Trưởng làng nói lời an ủi cuối cùng.
2. A Nguyệt tự đi tìm Tiểu Phàm trên map; khi đến gần, hội thoại tự bật. Không phải đứng chờ cố định ở quảng trường.
3. Chọn một trong 3 cách đáp lời: đi cùng, hẹn gặp tại vườn hoa hoặc hỏi thêm.
4. Đi bộ theo A Nguyệt qua cầu nối sang vườn hoa phía đông (khoảng x=2400, y=730); nàng chờ nếu Tiểu Phàm đi chậm.
5. Khi cả hai tới vườn hoa, trải nghiệm đoạn hội thoại thanh mai trúc mã, chọn một trong 3 lời hứa.
6. Nhận kỷ vật **Vòng Chỉ Đỏ** (không có hiệu ứng chiến đấu), sau đó về nhà ngủ.
7. Nửa đêm Liệp Ma tập kích, Nhiệm vụ 2 vẫn hoạt động như cũ.
8. Sau khi làng hoang tàn, ghé lại vườn hoa sẽ phát hiện dải ruy băng xanh và cuộc độc thoại về A Nguyệt. Không xác nhận nàng sống hay chết.

## Cơ chế kỹ thuật

- `public/game/a-nguyet.js`: thân hình dùng body chung, di chuyển trên đường đi `Villagers.route` đã có, luôn kiểm tra `Collision.canWalk` để không xuyên nhà, sông, luống hoa.
- `public/game/a-nguyet-story.js`: trạng thái tuyến truyện, hội thoại, lựa chọn, kỷ vật và dấu vết ở phế tích.
- `public/game/quest1.js`: tái sử dụng hộp hội thoại có avatar và bản nhiệm vụ HUD; bỏ chỉ dẫn “đang phát triển” sau khảo nghiệm.
- `public/game/game.js`: gọi truyện sau cập nhật nhiệm vụ, hiển thị dấu hiệu trên NPC, cho tương tác bằng phím và nút.
- `public/game/game-save.js`: thêm lưu trạng thái riêng, không đổi save key gameplay cũ.
- `public/game/A_Nguyet_Avatar_Duoi_10KB.webp`: dùng đúng ảnh gốc do người dùng cung cấp, không chỉnh màu hoặc nén lại.

**Trạng thái lưu:** `lang_du_lam_a_nguyet_story_v1` trong localStorage, tách khỏi save chính. Có `hasBracelet`, `affection`, `clueFound`, `npcPos`; không làm thay đổi cơ chế tử vong hoặc tải lại từ nửa đêm.

**Lưu ý:** Kỷ vật được lưu dưới dạng dữ liệu nhiệm vụ và nhắc trong bảng nhiệm vụ; game hiện chưa có giao diện hành trang để mở kỷ vật như vật phẩm thông thường.

**Giới hạn:** Kiểm thử tự động bằng Node và kiểm tra đường đi với collision đã có. Chưa kiểm thử trực quan hoàn chỉnh trong trình duyệt. Lệnh build Vite chưa chạy vì môi trường hiện chưa cài dependency `vite`. Có thể `npm install && npm run build` sau khi giải nén trên máy có internet hoặc mở dự án bằng Google AI Studio.
