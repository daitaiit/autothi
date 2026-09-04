import json
import os
import zipfile
import re

raw_data = [
    {
        "num": 1,
        "question": "Chỉ thị số 07-CT/TW, ngày 13/7/2026 của Bộ Chính trị về nội dung nào sau đây?",
        "options": [
            "Về tăng cường công tác kiểm tra, giám sát và kỷ luật của Đảng trong giai đoạn mới.",
            "Về đẩy mạnh học tập, thực hành tư tưởng, đạo đức, phương pháp, phong cách Hồ Chí Minh trong giai đoạn phát triển mới.",
            "Về tiếp tục đổi mới phương thức lãnh đạo của Đảng đối với hệ thống chính trị.",
            "Về xây dựng đội ngũ cán bộ, công chức đáp ứng yêu cầu phát triển đất nước."
        ],
        "correctAnswer": "Về đẩy mạnh học tập, thực hành tư tưởng, đạo đức, phương pháp, phong cách Hồ Chí Minh trong giai đoạn phát triển mới."
    },
    {
        "num": 2,
        "question": "Chỉ thị số 07-CT/TW, của Bộ Chính trị về đẩy mạnh học tập, thực hành tư tưởng, đạo đức, phương pháp, phong cách Hồ Chí Minh trong giai đoạn phát triển mới, ban hành vào thời gian nào?",
        "options": [
            "Ngày 13/5/2026",
            "Ngày 13/6/2026",
            "Ngày 13/7/2026",
            "Ngày 20/7/2026."
        ],
        "correctAnswer": "Ngày 13/7/2026"
    },
    {
        "num": 3,
        "question": "Theo Chỉ thị số 07-CT/TW, ngày 13/7/2026 của Bộ Chính trị, một trong những hạn chế được chỉ ra trong việc học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh thời gian qua là gì?",
        "options": [
            "Việc tổ chức học tập chưa được triển khai ở các tổ chức cơ sở đảng",
            "Một số nơi còn hình thức, thiếu chiều sâu, chưa chú trọng đúng mức việc thực hành, vận dụng phương pháp Hồ Chí Minh",
            "Việc tuyên truyền về tư tưởng Hồ Chí Minh chưa được thực hiện trên các phương tiện thông tin đại chúng",
            "Cán bộ, đảng viên chưa được nghiên cứu các tác phẩm của Chủ tịch Hồ Chí Minh"
        ],
        "correctAnswer": "Một số nơi còn hình thức, thiếu chiều sâu, chưa chú trọng đúng mức việc thực hành, vận dụng phương pháp Hồ Chí Minh"
    },
    {
        "num": 4,
        "question": "Theo Nghị quyết số 25-NQ/TW, ngày 22/8/2026 của Bộ Chính trị, về chiến lược công tác tư tưởng trong bối cảnh mới cần quán triệt sâu sắc và thực hiện tốt phương châm nào?",
        "options": [
            "Chủ động - Sáng tạo - Linh hoạt - Hiệu quả",
            "Chủ động - Sắc bén - Thuyết phục - Hiệu quả",
            "Kịp thời - Chính xác - Toàn diện - Đồng bộ",
            "Sâu sát - Đổi mới - Thực chất - Hiệu quả"
        ],
        "correctAnswer": "Chủ động - Sắc bén - Thuyết phục - Hiệu quả"
    },
    {
        "num": 5,
        "question": "Theo Nghị quyết số 25-NQ/TW, ngày 22/8/2026 của Bộ Chính trị có bao nhiêu nhiệm vụ, giải pháp chủ yếu?",
        "options": [
            "05",
            "06",
            "07",
            "08"
        ],
        "correctAnswer": "08"
    },
    {
        "num": 6,
        "question": "Nghị quyết số 23-NQ/TW, ngày 02/8/2026 của Bộ Chính trị về công tác người Việt Nam ở nước ngoài đề ra bao nhiêu nhiệm vụ, giải pháp?",
        "options": [
            "04",
            "05",
            "06",
            "07"
        ],
        "correctAnswer": "07"
    },
    {
        "num": 7,
        "question": "Theo Hướng dẫn số 03-HD/BTGTW, ngày 27/8/2026 của Ban Tuyên giáo Trung ương, về thực hiện Quy định số 19-QĐ/TW, ngày 08/4/2026 của Ban Chấp hành Trung ương Đảng về công tác chính trị tư tưởng trong Đảng, khung tiêu chí đánh giá đối với cán bộ đảng viên thực hiện theo bao nhiêu nội dung về “trách nhiệm của cán bộ, đảng viên”?",
        "options": [
            "04",
            "05",
            "06",
            "07"
        ],
        "correctAnswer": "04"
    },
    {
        "num": 8,
        "question": "Theo Nghị quyết số 24-NQ/TW, ngày 22/8/2026 của Bộ Chính trị về phát huy tính tiên phong, gương mẫu, tinh thần đổi mới, dám nghĩ, dám làm, dám chịu trách nhiệm của đội ngũ cán bộ, đảng viên trong kỷ nguyên mới, có bao nhiêu nhiệm vụ, giải pháp?",
        "options": [
            "04",
            "05",
            "06",
            "07"
        ],
        "correctAnswer": "05"
    },
    {
        "num": 9,
        "question": "Theo Nghị quyết số 24-NQ/TW, ngày 22/8/2026 của Bộ Chính trị, để đánh giá cán bộ, đảng viên về tinh thần dấn thân, đổi mới, dám nghĩ, dám làm vì lợi ích chung, cần lấy yếu tố nào làm thước đo?",
        "options": [
            "Thâm niên công tác và mức độ hoàn thành nhiệm vụ hằng năm.",
            "Số lượng sáng kiến, đề tài được đăng ký trong năm.",
            "Kết quả, sản phẩm cụ thể, hiệu quả thực thi, khả năng tháo gỡ điểm nghẽn và mức độ hài lòng của Nhân dân, doanh nghiệp.",
            "Mức độ hoàn thành các chỉ tiêu thi đua của cơ quan, đơn vị."
        ],
        "correctAnswer": "Kết quả, sản phẩm cụ thể, hiệu quả thực thi, khả năng tháo gỡ điểm nghẽn và mức độ hài lòng của Nhân dân, doanh nghiệp."
    },
    {
        "num": 10,
        "question": "Theo Nghị quyết số 26-NQ/TW, ngày 22/8/2026 của Bộ Chính trị về phát triển du lịch Việt Nam trở thành ngành kinh tế mũi nhọn trong kỷ nguyên mới. Mục tiêu đến năm 2030, Du lịch Việt Nam phấn đấu đón bao nhiêu lượt khách quốc tế?",
        "options": [
            "45-50 triệu",
            "30-35 triệu",
            "35-45 triệu",
            "40-45 triệu"
        ],
        "correctAnswer": "45-50 triệu"
    }
]

questions_map = {}
for item in raw_data:
    key = item["question"].strip().lower()
    questions_map[key] = {
        "question": item["question"].strip(),
        "correctAnswer": item["correctAnswer"].strip(),
        "options": item["options"]
    }

new_contest = {
    "id": "hoi_nghi_bct_03092026",
    "name": "Hội nghị toàn quốc học tập, quán triệt Nghị quyết, Chỉ thị của Bộ Chính trị (03/9/2026)",
    "organizer": "Ban Tuyên giáo Trung ương",
    "domain_match": "danguyccqdanglamdong.vn",
    "contest_url": "https://nghiquyet.danguyccqdanglamdong.vn/cuoc-thi/hoi-nghi-toan-quoc-nghien-cuu-hoc-tap-quan-triet-nghi-quyet-chi-thi-bct-03092026.html",
    "version": 1,
    "total_questions": len(raw_data),
    "updated_at": "03/09/2026",
    "description": "Trọn bộ 10 câu hỏi & đáp án chuẩn (1B – 2C – 3B – 4B – 5D – 6D – 7A – 8B – 9C – 10A) do Tafinex cập nhật.",
    "questions": questions_map
}

paths = [
    r"d:\Tool\AutoThi\contests_manifest.json",
    r"d:\Tool\AutoThi\server_data_sample\contests_manifest.json"
]

for p in paths:
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Remove any existing contest with same id
    data["contests"] = [c for c in data.get("contests", []) if c.get("id") != new_contest["id"]]
    # Insert new contest at the beginning
    data["contests"].insert(0, new_contest)

    data["version"] = "2.5.0"
    data["updated_at"] = "2026-09-04T08:30:00Z"
    data["announcement"] = "Đã cập nhật bộ đề Hội nghị toàn quốc học tập, quán triệt Nghị quyết, Chỉ thị của Bộ Chính trị (03/9/2026): 1B – 2C – 3B – 4B – 5D – 6D – 7A – 8B – 9C – 10A!"

    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Updated {p} successfully!")

# Rebuild zip
base_dir = r"d:\Tool\AutoThi"
zip_filename = os.path.join(base_dir, "AutoThi-Extension.zip")
include_dirs = ["icons", "popup", "scripts"]
include_files = ["manifest.json", "contests_manifest.json"]

with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for f in include_files:
        fp = os.path.join(base_dir, f)
        if os.path.exists(fp):
            zipf.write(fp, f)
            print(f"Added file: {f}")

    for d in include_dirs:
        dp = os.path.join(base_dir, d)
        for root, dirs, files in os.walk(dp):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, base_dir)
                zipf.write(full_path, rel_path)

print(f"\nRebuilt extension package: {zip_filename} ({os.path.getsize(zip_filename)} bytes)")
