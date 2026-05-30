import fetch from 'node-fetch';

const apiKey = 'AIzaSyCnI1Ou6TJmFOkEhnREMSVc47lEZ5SvZlM';
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

async function testKey() {
  console.log('Testing gemini-2.5-flash...');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Hello' }] }],
    }),
  });

  console.log('Status:', res.status);
  const data = await res.text();
  console.log('Response:', data);
}

testKey();
