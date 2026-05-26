import os
import glob

html_files = glob.glob('public/*.html')

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the text
    content = content.replace('ShePanel', 'Partner Hub')
    content = content.replace('ShePanel Portal', 'Partner Hub Portal')
    content = content.replace('Join ShePanel', 'Join Partner Hub')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Renamed ShePanel to Partner Hub in HTML files.")
