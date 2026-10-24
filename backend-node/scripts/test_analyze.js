async function testAnalyze() {
  const res = await fetch('http://localhost:5000/api/rides/analyze-feed/space_mountain', {
    method: 'POST'
  });
  const data = await res.json();
  console.log('Analyze Result:', JSON.stringify(data, null, 2));
}

testAnalyze();
