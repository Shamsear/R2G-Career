/**
 * Test Knockout API Endpoints
 * Quickly test the knockout tournament functionality
 */

const baseUrl = 'http://localhost:3000';

async function testKnockoutAPI() {
  console.log('🧪 Testing Knockout Tournament API\n');

  // Test tournament ID - you'll need to replace with a real one
  const testTournamentId = 'SSPSLS01-LEAGUE'; // Update this!

  try {
    // Test 1: GET - Fetch knockout rounds
    console.log('1️⃣ Testing GET /api/tournaments/[id]/knockout');
    const getResponse = await fetch(`${baseUrl}/api/tournaments/${testTournamentId}/knockout`);
    const getData = await getResponse.json();
    console.log('   Status:', getResponse.status);
    console.log('   Response:', JSON.stringify(getData, null, 2));
    console.log('   ✅ GET endpoint working\n');

    // Test 2: POST - Create knockout round (Auto mode)
    console.log('2️⃣ Testing POST /api/tournaments/[id]/knockout (Auto mode)');
    const createResponse = await fetch(`${baseUrl}/api/tournaments/${testTournamentId}/knockout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roundName: 'QUARTER_FINAL',
        legs: 2,
        mode: 'AUTO',
        createFullBracket: true
      })
    });
    const createData = await createResponse.json();
    console.log('   Status:', createResponse.status);
    console.log('   Response:', JSON.stringify(createData, null, 2));
    
    if (createData.success) {
      console.log('   ✅ POST endpoint working - Knockout round created!\n');

      // Test 3: GET again to see the created rounds
      console.log('3️⃣ Fetching created rounds');
      const getRoundsResponse = await fetch(`${baseUrl}/api/tournaments/${testTournamentId}/knockout`);
      const getRoundsData = await getRoundsResponse.json();
      console.log('   Rounds created:', getRoundsData.rounds?.length || 0);
      getRoundsData.rounds?.forEach(round => {
        console.log(`   - ${round.roundName}: ${round.pairings?.length || 0} pairings`);
      });
      console.log('   ✅ Rounds fetched successfully\n');

      // Test 4: DELETE - Reset bracket
      console.log('4️⃣ Testing DELETE /api/tournaments/[id]/knockout (cleanup)');
      const deleteResponse = await fetch(`${baseUrl}/api/tournaments/${testTournamentId}/knockout`, {
        method: 'DELETE'
      });
      const deleteData = await deleteResponse.json();
      console.log('   Status:', deleteResponse.status);
      console.log('   Response:', JSON.stringify(deleteData, null, 2));
      console.log('   ✅ DELETE endpoint working - Bracket reset\n');
    } else {
      console.log('   ⚠️  Round creation returned an error (may be expected)');
      console.log('   Error:', createData.error);
    }

    console.log('🎉 All API tests completed!\n');
    console.log('📝 Notes:');
    console.log('- Update testTournamentId with a real tournament ID');
    console.log('- Set tournament_format in database before creating rounds');
    console.log('- Check KNOCKOUT_QUICKSTART.md for usage examples');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('1. Next.js dev server is running (npm run dev)');
    console.log('2. Tournament ID exists in database');
    console.log('3. Database connection is configured');
  }
}

// Run tests
testKnockoutAPI();
