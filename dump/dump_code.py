import os

EXCLUDED_DIRS = {'.venv', '__pycache__', '.git', 'node_modules', 'public'}
EXCLUDED_FILES = {'dump_code.py', 'code_dump.txt'}
OUTPUT_FILE = "dump/code_dump.txt"

FRONTEND_SRC_DIR = os.path.normpath("frontend/src")

def should_include_backend(file, rel_path):
    return file.endswith(".py") and file not in EXCLUDED_FILES and not rel_path.startswith(FRONTEND_SRC_DIR)

def should_include_frontend(file, rel_path):
    return rel_path.startswith(FRONTEND_SRC_DIR) and file not in EXCLUDED_FILES

def collect_files(root_dir="."):
    backend_files = []
    frontend_files = []

    for foldername, subfolders, filenames in os.walk(root_dir):
        rel_folder = os.path.normpath(os.path.relpath(foldername, root_dir))

        # Filter subfolders
        if rel_folder == "frontend":
            subfolders[:] = [d for d in subfolders if d == "src"]
        elif rel_folder.startswith("frontend/") and not rel_folder.startswith(FRONTEND_SRC_DIR):
            subfolders[:] = []
            continue

        subfolders[:] = [d for d in subfolders if d not in EXCLUDED_DIRS]

        for filename in filenames:
            filepath = os.path.join(foldername, filename)
            rel_path = os.path.normpath(os.path.relpath(filepath, root_dir))

            if should_include_backend(filename, rel_path):
                backend_files.append((filepath, rel_path))
            elif should_include_frontend(filename, rel_path):
                frontend_files.append((filepath, rel_path))

    return backend_files, frontend_files

def dump_files(file_list, out):
    for filepath, rel_path in file_list:
        out.write(f"\n{'='*80}\n")
        out.write(f"# 📄 {rel_path}\n")
        out.write(f"{'='*80}\n\n")
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            out.write(f.read())
            out.write("\n\n")

def dump_project_code():
    backend_files, frontend_files = collect_files()

    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        # 1. Backend Code
        dump_files(backend_files, out)

        # 2. Divider for frontend
        out.write("\n\n")
        out.write("="*80 + "\n")
        out.write("🚀 FRONTEND CODE: ALL FILES IN frontend/src\n")
        out.write("="*80 + "\n\n")

        # 3. Frontend Code
        dump_files(frontend_files, out)

    print(f"\n✅ Code dump complete. Output written to: {OUTPUT_FILE}")

if __name__ == "__main__":
    dump_project_code()
