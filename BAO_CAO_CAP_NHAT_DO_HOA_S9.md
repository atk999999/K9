# S9 — Điều chỉnh đồ họa nghĩa trang và nhân vật (09/11/2026)

- Giữ nguyên ảnh AI gốc 60 bia mộ và cây anh đào; làm mới `nghia_trang_tuong_niem.webp` với tông đất dịu, lạnh hơn và viền alpha mờ theo đúng rìa không đều, giúp hòa với map hoang tàn.
- Không sửa hitbox, tọa độ bia mộ, nhiệm vụ hoặc dữ liệu lưu.
- Camera nghĩa trang: dời tâm nhìn đến (375,765), chiều rộng khung 590 thế giới để tránh cắt hàng bia mộ phía trái trên điện thoại dọc, vẫn giữ nội suy + vùng đệm ở bản sửa trước.
- Nâng buffer nhân vật Tiểu Phàm/NPC chính lên độ phân giải gấp đôi trước khi thu nhỏ bằng lọc chất lượng cao để mặt, tóc và đường nét cơ thể bớt bậc thang.
- Vẽ ảnh nền chính bằng bộ lọc chất lượng cao; lớp sprite/địa hình còn lại giữ nguyên kỹ thuật dựng cũ.
- File `nghia_trang_tuong_niem_goc.webp` vẫn được giữ lại để đối chiếu; phần game sử dụng sprite v2.
- Lưu Chrome vẫn nằm trong localStorage nên không mất khi giải nén đè ZIP.
