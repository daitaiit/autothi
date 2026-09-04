import os
import json
import zipfile

base_dir = r"d:\Tool\AutoThi"

# 1. popup/popup.html
popup_html_path = os.path.join(base_dir, "popup", "popup.html")
with open(popup_html_path, "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("Phát triển bởi <b style=\"color: #38bdf8;\">DataIT</b>", "Phát triển bởi <b style=\"color: #38bdf8;\">Tafinex</b>")
content = content.replace("DataIT", "Tafinex")
with open(popup_html_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated popup.html")

# 2. manifest.json
manifest_path = os.path.join(base_dir, "manifest.json")
with open(manifest_path, "r", encoding="utf-8") as f:
    m = json.load(f)
m["author"] = "Tafinex"
m["description"] = "Tự động phân tích, giải đề và chọn đáp án trắc nghiệm chính xác bằng AI & Ngân hàng đề thông minh. Phát triển bởi Tafinex."
with open(manifest_path, "w", encoding="utf-8") as f:
    json.dump(m, f, ensure_ascii=False, indent=2)
print("Updated manifest.json")

# 3. contests_manifest.json & server_data_sample/contests_manifest.json
for mf_rel in ["contests_manifest.json", os.path.join("server_data_sample", "contests_manifest.json")]:
    mf_path = os.path.join(base_dir, mf_rel)
    with open(mf_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    data["author"] = "Tafinex"
    for c in data.get("contests", []):
        if "description" in c:
            c["description"] = c["description"].replace("Đại Tài", "Tafinex").replace("DataIT", "Tafinex")
    with open(mf_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Updated {mf_rel}")

# 4. Cai_Dat_Nhanh.bat
bat1 = os.path.join(base_dir, "Cai_Dat_Nhanh.bat")
with open(bat1, "r", encoding="utf-8") as f:
    b1_content = f.read()
b1_content = b1_content.replace("Đại Tài", "Tafinex").replace("DataIT", "Tafinex")
with open(bat1, "w", encoding="utf-8") as f:
    f.write(b1_content)
print("Updated Cai_Dat_Nhanh.bat")

# 5. Cap_Nhat_Nhanh.bat
bat2 = os.path.join(base_dir, "Cap_Nhat_Nhanh.bat")
with open(bat2, "r", encoding="utf-8") as f:
    b2_content = f.read()
b2_content = b2_content.replace("Đại Tài", "Tafinex").replace("DataIT", "Tafinex")
with open(bat2, "w", encoding="utf-8") as f:
    f.write(b2_content)
print("Updated Cap_Nhat_Nhanh.bat")

# 6. HUONG_DAN_SU_DUNG.md
guide_md = os.path.join(base_dir, "HUONG_DAN_SU_DUNG.md")
with open(guide_md, "r", encoding="utf-8") as f:
    guide_content = f.read()
guide_content = guide_content.replace("Đại Tài", "Tafinex").replace("DataIT", "Tafinex")
with open(guide_md, "w", encoding="utf-8") as f:
    f.write(guide_content)
print("Updated HUONG_DAN_SU_DUNG.md")

# 7. Rebuild zip
zip_filename = os.path.join(base_dir, "AutoThi-Extension.zip")
include_dirs = ["icons", "popup", "scripts"]
include_files = ["manifest.json", "contests_manifest.json"]

with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for f in include_files:
        fp = os.path.join(base_dir, f)
        if os.path.exists(fp):
            zipf.write(fp, f)

    for d in include_dirs:
        dp = os.path.join(base_dir, d)
        for root, dirs, files in os.walk(dp):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, base_dir)
                zipf.write(full_path, rel_path)

print(f"Rebuilt zip: {zip_filename} ({os.path.getsize(zip_filename)} bytes)")
