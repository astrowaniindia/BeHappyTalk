const fs = require('fs');
const path = require('path');

const sourceDir = 'd:/Projects/BeHappyTalk/server/public';
const targetDir = 'd:/Projects/BeHappyTalk/website/src/pages';
const files = [
  { file: 'privacy.html', name: 'PrivacyPolicy' },
  { file: 'terms.html', name: 'Terms' },
  { file: 'safety.html', name: 'Safety' },
  { file: 'child-safety.html', name: 'ChildSafety' },
  { file: 'report-vulnerability.html', name: 'ReportVulnerability' }
];

files.forEach(({file, name}) => {
  const content = fs.readFileSync(path.join(sourceDir, file), 'utf8');
  const headerMatch = content.match(/<div class="legal-header">([\s\S]*?)<\/div>/);
  const contentMatch = content.match(/<div class="legal-content">([\s\S]*?)<\/div>\s*<\/div>\s*<!-- Footer -->/);
  
  if (headerMatch && contentMatch) {
    let rawHtml = headerMatch[0] + "\n" + contentMatch[0].replace('</div>\n  </div>\n  <!-- Footer -->', '</div>');
    
    // Quick fix for self-closing tags or styles if any
    rawHtml = rawHtml.replace(/class=/g, 'className=');

    const componentCode = `import React, { useEffect } from 'react';

export default function ${name}() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="section-block legal-page" style={{ minHeight: 'calc(100vh - 88px)' }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="legal-content-wrapper" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(rawHtml)} }} />
      </div>
    </section>
  );
}
`;
    fs.writeFileSync(path.join(targetDir, name + '.tsx'), componentCode);
    console.log('Generated ' + name + '.tsx');
  } else {
    console.log('Failed to match ' + file);
  }
});
