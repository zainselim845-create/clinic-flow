import os
import re

files_checked = 0
dead_anchors = []
debug_logs = []
react_warnings = []

for root, dirs, files in os.walk('src'):
    for f in files:
        if f.endswith(('.js', '.jsx')):
            files_checked += 1
            file_path = os.path.join(root, f)
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as fp:
                lines = fp.readlines()
                for idx, line in enumerate(lines, 1):
                    # Check for dead links
                    if 'href="#"' in line or "href='#'" in line:
                        dead_anchors.append(f"{file_path}:{idx}: {line.strip()}")
                    
                    # Check for leftover console.log in pages and components
                    if ('src\\pages' in file_path or 'src\\components' in file_path) and 'console.log(' in line:
                        debug_logs.append(f"{file_path}:{idx}: {line.strip()}")

print(f"Total files checked: {files_checked}")
print(f"Dead anchors found: {len(dead_anchors)}")
for d in dead_anchors:
    print(f" [DEAD_ANCHOR] {d}")

print(f"Debug logs found in UI: {len(debug_logs)}")
for l in debug_logs:
    print(f" [DEBUG_LOG] {l}")
