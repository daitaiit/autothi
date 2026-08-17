import zipfile
import os

zip_filename = r"d:\Tool\AutoThi\AutoThi-Extension.zip"
include_dirs = ["icons", "popup", "scripts"]
include_files = ["manifest.json", "contests_manifest.json"]

base_dir = r"d:\Tool\AutoThi"

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
                print(f"Added: {rel_path}")

print(f"\nCreated successfully: {zip_filename} ({os.path.getsize(zip_filename)} bytes)")
