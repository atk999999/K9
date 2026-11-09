# Click91 — Hiệu ứng khói/lửa sau Huyết Dạ (09/11/2026)

- Nguồn: `Click91_Thoi_Gian_Nhiem_Vu3_Dap_Mo_15h.zip`; giữ nguyên nhiệm vụ, ảnh AI nghĩa trang và mốc 15:00.
- Bổ sung `public/game/ruins-ambient-fx.js`: lửa/than hồng, khói bay có gió và tàn tro. Canvas JavaScript, không thêm file ảnh, không ảnh hưởng vùng va chạm.
- Chỉ chạy khi `Quest2.isVillageRuined()` (sau Huyết Dạ). Hiệu ứng vẫn còn lúc 15:00, giảm trong mưa/bão; vùng ngoài camera được cắt giảm tải trên di động.
- Mã dựng lớp mặt đường sạch từ `map.webp` cùng tọa độ rồi ghép viền mềm lên vệt máu in sẵn trước nhà Tiểu Phàm; dữ liệu ảnh gốc không bị thay đổi. Đã bỏ điểm máu động (333,337) trong hiệu ứng đêm.
- Các vùng mộ và A Nguyệt không được tác động, không sửa save, thời gian, tương tác ngủ/núp gầm giường.
- Kiểm thử: `npm test` và `tests/ruins-ambient-fx.cjs`.

Lưu ý: Không xoá tất cả các dấu vết trên bản đồ; chỉ vùng trước nhà người chơi được làm sạch. Đây là bản sửa mã game, không phải ảnh map tĩnh.
