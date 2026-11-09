# Báo cáo chỉnh Liệp Ma trong nhà và đồng bộ phong cách map

## Nội dung đã chỉnh

1. **Giảm tốc độ Liệp Ma trong nhà**
   - Nhánh rượt đuổi khi còn ở trong nhà giảm từ kiểu lao nhanh sang tốc độ chậm hơn.
   - Có nhịp khựng lại và đánh hơi trước khi tiếp tục áp sát người chơi.

2. **Làm hành động tự nhiên hơn**
   - Hoạt cảnh nấp trong chum được kéo giãn thời gian.
   - Trước mỗi cú đánh vào giường và tủ, Liệp Ma đều có đoạn dừng rà mùi rõ hơn.
   - Nhánh đuổi trong nhà sử dụng chu kỳ `sniff -> walk` thay vì chạy liên tục.

3. **Đồng bộ phong cách với map**
   - Sprite Liệp Ma được xử lý giảm độ bóng, giảm bão hòa và pixel hóa lại.
   - Hai spritesheet `giuong_pha_huy.webp` và `tu_quan_ao_pha_huy.webp` được pixel hóa lại để hợp hơn với nền map Click91.
   - Thu nhỏ nhẹ Liệp Ma và phủ tông tối lạnh khi render để giảm cảm giác lạc phong cách.

4. **Giữ nguyên logic quan trọng**
   - Đồ vật chỉ vỡ khi Liệp Ma thực sự đánh trúng.
   - Chum nước không bị phá.
   - Luồng nhiệm vụ 2 và các nhiệm vụ khác không bị phá vỡ.

## File chính đã chỉnh
- `public/game/quest2.js`
- `public/game/quest2-render.js`
- `public/game/liep-ma/liep-ma-sprites.webp`
- `public/game/giuong_pha_huy.webp`
- `public/game/tu_quan_ao_pha_huy.webp`
- `tests/quest2.cjs`
- `tests/quest-fixes.cjs`

## Kiểm thử
Chạy `npm test --silent`:
- Toàn bộ bộ kiểm thử hiện có đều **PASS**.
- Riêng Nhiệm vụ 2 đạt **12/12** bài kiểm thử.
