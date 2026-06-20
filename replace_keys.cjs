const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        filelist = walkSync(path.join(dir, file), filelist);
      }
    }
    else {
      if (file.endsWith('.mjs') || file.endsWith('.js')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const files = walkSync('.');
let changed = 0;
files.forEach(file => {
  if (file === 'replace_keys.js') return;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  content = content.replace(/['"]https:\/\/vsslcbsdvxbsfivcfxfd\.supabase\.co['"]/g, 'process.env.NEXT_PUBLIC_SUPABASE_URL');
  content = content.replace(/['"]eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ\.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk['"]/g, 'process.env.SUPABASE_SERVICE_ROLE_KEY');
  content = content.replace(/['"]eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTEwNTgsImV4cCI6MjA5NTE2NzA1OH0\.LoUSj7j7e5CDU-fBvxUxovqUulkbVrhIgOtVQ2LrGao['"]/g, 'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  if (content !== original) {
    if (!content.includes('dotenv')) {
      if (file.endsWith('.mjs')) {
        content = "import 'dotenv/config';\n" + content;
      } else {
        content = "require('dotenv').config();\n" + content;
      }
    }
    fs.writeFileSync(file, content, 'utf8');
    changed++;
    console.log('Updated', file);
  }
});
console.log('Total updated:', changed);
