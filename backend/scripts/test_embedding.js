import fetch from 'node-fetch';

const apiKey = 'AIzaSyD33ciE081-1kYGEjFqB7jqv6e3KLZfCiA';
const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;

async function testEmbedding() {
  console.log('Testing text-embedding-004...');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text: 'Hello' }] }
    }),
  });
  
  console.log('Status:', res.status);
  const data = await res.text();
  console.log('Response:', data.substring(0, 200));
}

testEmbedding();
