import os
import re

print("=" * 60)
print("  DEEP CODEBASE AUDIT & STATIC ANALYSIS")
print("=" * 60)

src_dir = 'src'
errors_found = []
warnings_found = []
files_scanned = 0

# Patterns to detect potential issues
patterns = [
    (r'\.map\(\s*\([^)]*\)\s*=>\s*<[A-Za-z0-9]+(?![^>]*key=)', 'React: Missing key in .map() rendering'),
    (r'localStorage\.(getItem|setItem|removeItem)\([^)]*\)(?!.*try)', 'LocalStorage call without try/catch protection nearby'),
    (r'window\.location\.href\s*=', 'Direct window.location navigation instead of react-router navigate/Link'),
    (r'href="#"', 'Dead anchor href="#"'),
    (r'console\.error\([^)]*\)', 'Console error call'),
    (r'dangerouslySetInnerHTML', 'Potential XSS with dangerouslySetInnerHTML'),
    (r'JSON\.parse\([^)]*\)(?!.*try)', 'JSON.parse without try/catch'),
]

for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith(('.js', '.jsx')):
            files_scanned += 1
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                lines = fp.readlines()
                content = ''.join(lines)

                # Check for undefined variables in JSX
                for idx, line in enumerate(lines, 1):
                    # Check for undefined prop lookups like undefined.something
                    if 'undefined.' in line:
                        errors_found.append(f"Undefined property lookup: {path}:{idx} -> {line.strip()}")
                    
                    # Check for leftover TODO or FIXME
                    if 'TODO:' in line or 'FIXME:' in line:
                        warnings_found.append(f"TODO/FIXME item: {path}:{idx} -> {line.strip()}")

                # Check for missing imports
                # e.g., if useApp is used but not imported
                if 'useApp(' in content and 'import { useApp }' not in content and 'import { useApp,' not in content and 'import {useApp}' not in content and 'const useApp' not in content:
                    errors_found.append(f"Missing useApp import in: {path}")

                # Check if useState is used without import
                if 'useState(' in content and 'useState' not in content.split('from \'react\'')[0] and 'useState' not in content.split('from "react"')[0] and 'React.useState' not in content:
                    errors_found.append(f"Missing useState import in: {path}")

print(f"Scanned {files_scanned} source files.")
print(f"Errors detected: {len(errors_found)}")
for e in errors_found:
    print(f" [ERROR] {e}")

print(f"Warnings detected: {len(warnings_found)}")
for w in warnings_found[:15]:
    print(f" [WARN] {w}")

print("=" * 60)
