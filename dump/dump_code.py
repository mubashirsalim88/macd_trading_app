import os

EXCLUDED_DIRS = {'.venv', '__pycache__', '.git', 'frontend'}
EXCLUDED_FILES = {'dump_code.py', 'code_dump.txt'}
OUTPUT_FILE = "dump/code_dump.txt"

def should_include(file):
    if not file.endswith(".py"):
        return False
    if file in EXCLUDED_FILES:
        return False
    return True

def dump_project_code(root_dir=".", output_file=OUTPUT_FILE):
    with open(output_file, "w", encoding="utf-8") as out:
        for foldername, subfolders, filenames in os.walk(root_dir):
            # Skip unwanted folders
            subfolders[:] = [d for d in subfolders if d not in EXCLUDED_DIRS]
            for filename in filenames:
                if should_include(filename):
                    filepath = os.path.join(foldername, filename)
                    rel_path = os.path.relpath(filepath, root_dir)

                    out.write(f"\n{'='*80}\n")
                    out.write(f"# 📄 {rel_path}\n")
                    out.write(f"{'='*80}\n\n")

                    with open(filepath, "r", encoding="utf-8") as f:
                        out.write(f.read())
                        out.write("\n\n")

    print(f"\n✅ Code dump complete. Output written to: {output_file}")

if __name__ == "__main__":
    dump_project_code(".")
