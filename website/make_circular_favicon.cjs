const fs = require('fs');
const b64 = fs.readFileSync('public/favicon.png').toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <clipPath id="circleClip">
      <circle cx="256" cy="256" r="256" />
    </clipPath>
  </defs>
  <image href="data:image/png;base64,${b64}" width="512" height="512" clip-path="url(#circleClip)" />
</svg>`;
fs.writeFileSync('public/favicon-circle.svg', svg);
console.log('Done');
