import glob

html_files = glob.glob('public/*.html')

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace 'Partner Hub' with 'BeHappyTalk Partner Hub'
    # Be careful not to replace it if it's already 'BeHappyTalk Partner Hub'
    content = content.replace('BeHappyTalk Partner Hub', 'Partner Hub') # normalize first just in case
    content = content.replace('Partner Hub', 'BeHappyTalk Partner Hub')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Renamed to BeHappyTalk Partner Hub")
