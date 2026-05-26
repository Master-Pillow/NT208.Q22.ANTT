import fs from 'fs';
const data = JSON.parse(fs.readFileSync('d:/Study/HK4/Web/Doan4/NT208.Q22.ANTT/backend/scripts/chunks.json', 'utf8'));
const matches = data.filter(c => c.content.toLowerCase().includes('an toàn thông tin'));
console.log('Matches:', matches.length);
console.log(matches.map(m => m.content.substring(0, 150)));
