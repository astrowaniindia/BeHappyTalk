const fs = require('fs');
const path = require('path');

const dir = 'd:/Projects/BeHappyTalk/provider-app';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    if (file === 'node_modules') return;
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(dir);
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('https://behappytalk-server-ipxj.onrender.com')) {
    fs.writeFileSync(file, content.replace(/https:\/\/behappytalk-server-ipxj\.onrender\.com/g, 'http://192.168.29.168:3000'));
    console.log('Updated', file);
  }
});
