# Click91 — Nâng cấp NPC quan trọng V2

- **A Nguyệt (ưu tiên):** Tách nét mặt đặc trưng khỏi khuôn mặt gốc Tiểu Phàm bằng lớp vẽ Canvas dành riêng. Có gương mặt bầu nhẹ, mắt có điểm sáng, chớp mắt, má hồng, môi, tóc mái mềm, tóc mai dao động theo chuyển động, góc nghiêng có mũi và mắt riêng, sau đầu có đường sáng tóc. Giữ nguyên váy lụa xanh, nơ, trâm và ruy băng có sẵn.
- **A Huy:** Điều chỉnh sắc má, chân mày và nét miệng để có vẻ trẻ trung, vui tươi.
- **Trưởng làng:** Bổ sung nét chân mày bạc và nếp nhăn nhẹ cho dáng trưởng bối.
- **Lục Nham:** Tăng nét lạnh, điềm tĩnh ở chân mày và chi tiết trâm.

Không thay dữ liệu NPC, sự kiện, thoại, hitbox, cách đi, cơ chế nhiệm vụ, avatar hội thoại. Không thêm ảnh nặng.

Kiểm thử: `npm test`, `node tests/npc-face-upgrade.cjs`.

Giới hạn: Thiết kế vẫn được vẽ bằng Canvas, chưa phải hệ sprite atlas vẽ tay. Cần đánh giá trực quan trên điện thoại trước khi chốt phong cách cuối.
