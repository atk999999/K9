# Báo cáo sửa lỗi tương tác giường — Làng Du Lãm

## Vấn đề trước khi sửa
- Nút tương tác giường bị thay bằng hành động «Chui gầm giường» ở trạng thái bình thường.
- Chỉ có thể ngủ thông qua nút tương tác khi Quest 2 đang ở `ready_to_rest` hoặc ngày khảo nghiệm.
- Nút `talk` cũ bị ẩn trong CSS nên không thể dùng làm lựa chọn thứ hai.

## Đã sửa
- Nút tương tác chính «NẰM NGỦ» luôn dùng để nằm ngủ khi đứng sát giường, giữ nguyên quy tắc chặn khảo nghiệm và cảnh A Nguyệt đang chờ.
- Nút phụ «NÚP GẦM» riêng hiện cạnh cụm điều khiển khi đứng sát giường còn nguyên vẹn; trên PC có thể nhấn H để núp.
- Phím E, J, F và Space kích hoạt tương tác chính. Chạm trực tiếp vào giường cũng là thao tác ngủ thông thường.
- Giữ nguyên hành động lựa chọn nơi trốn trong sự kiện Liệp Ma (midnight_wake / window_shadow / countdown_hide). Nút phụ bị ẩn trong cảnh sinh tồn và khi giường bị phá hủy.
- Giữ nguyên lưu/tải, hoạt ảnh, assets, map và các nhiệm vụ.

## Kiểm thử
- `npm test`: PASS toàn bộ test suite (bao gồm thử nghiệm mới trong `tests/qa-fixed.cjs` cho ngủ qua ngày, núp gầm riêng, giới hạn của Nhiệm vụ 2).
- `node --check public/game/tieu-pham-home.js`: PASS.
- `node --check public/game/game.js`: PASS.
