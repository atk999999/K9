# Báo cáo sửa lỗi Liệp Ma — giường và tủ tự vỡ

Ngày: 08/11/2026. Dự án: Click91 / Làng Du Lãm.

## Lỗi gốc
Ở nhánh Tiểu Phàm trốn trong chum (Quest2, `HIDING_JAR`), mã cũ đặt `bedBroken = true` và `wardrobeBroken = true` đồng thời tại giây 3,2. Trong khi đó renderer chỉ cho Liệp Ma đi bộ từ `(374,152)` tới `(430,225)`. Không hề có hoạt ảnh tấn công hoặc va chạm với giường `(548,165)` và tủ `(129,135)` khi hai đồ vật bị phá hủy.

## Sửa chữa
- Đưa lộ trình Liệp Ma và mốc va chạm vào cùng mã nguồn logic, dùng đồng nhất trong bộ dựng hình.
- Liệp Ma tiến gần giường, đánh hơi, chém từ giây 4,12; giường chỉ vỡ khi móng vuốt chạm vào lúc 4,45.
- Tủ vẫn nguyên vẹn trong lúc Liệp Ma phá giường. Liệp Ma đi tới tủ, đánh hơi, chém từ giây 7,12; tủ chỉ vỡ lúc 7,48.
- Đồng bộ sprite `attack`, vệt vuốt, mảnh gỗ, tiếng gãy và rung màn hình với từng cú đánh.
- Đến cạnh chum lúc giây 10,22, gõ nhẹ vào nắp chum, không làm vỡ chum; sau đó rời đi khoảng giây 13,1.
- Giữ nguyên các nhánh trốn sai (giường, tủ, cửa), chơi lại lúc 00:00, sống sót trong chum và nhiệm vụ tiếp theo.
- Tăng phiên bản truy vấn bộ nhớ đệm cho hai tệp mã nguồn đã sửa: `quest2.js?v=monster190`, `quest2-render.js?v=monster190`.

## Kiểm thử
- `npm test`: toàn bộ tập lệnh hồi quy hiện có thành công (gồm 12/12 kiểm thử nhiệm vụ 2).
- Chromium Playwright (màn hình 1000×700): chụp các mốc 3,50; 4,25; 4,58; 7,22; 7,60; 10,75 giây. Trạng thái giường/tủ quan sát được: 0/0 → 0/0 → 1/0 → 1/0 → 1/1 → 1/1. Chum vẫn nguyên vẹn.
- Không có lỗi JavaScript hay tài nguyên HTTP 404 trong lượt kiểm thử Chromium.
- Chưa kiểm tra bằng thao tác tay trên điện thoại Android thật; các khung hình kiểm thử được tăng tốc có kiểm soát.
