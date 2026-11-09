# Sửa lỗi logic hồi ức - 08/11/2026

- Chặn game.js xử lý Space trùng với Quest3 trong motion comic; Quest3 nhận Space/Enter một lần cho mỗi lần nhấn (không nhận key repeat).
- Áp dụng `Quest3.isNavigationLocked()` thống nhất cho về nhà, Xóm Đông, toàn cảnh và các nút điều hướng/đổi thời gian được điều khiển bởi `questNavigationLocked()`.
- Lưu `comic_checkpoint` (loại cảnh, thứ tự khung, lựa chọn hồi ức đêm) sau khi mở cảnh hoặc chuyển khung.
- Khi tải lại, tái dựng chuỗi cảnh tương ứng và callback hoàn tất; không đánh mất tiến trình nhiệm vụ giữa hồi ức.
- Xóa checkpoint khi cảnh hoàn tất, giữ tiến độ nhiệm vụ và vật phẩm như cũ.
- Bổ sung kiểm thử lưu/khôi phục khung 2 và mở khóa điều hướng khi hoàn tất trong tests/quest3.cjs.

Kiểm chứng: `npm test` thành công. `node --check` thành công cho hai file sửa. `npm run build` chưa thực thi được do môi trường thiếu `vite`/node_modules (cần `npm install` trước khi build).
