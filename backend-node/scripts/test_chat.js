async function testChat() {
  const res = await fetch('http://localhost:5000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userMessage: 'What is the wait time for Space Mountain and what do you recommend?',
      sessionId: 'test-session-1'
    })
  });
  const data = await res.json();
  console.log('Chat Response:', JSON.stringify(data, null, 2));
}

testChat();
