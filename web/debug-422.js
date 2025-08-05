/**
 * Debug the 422 error response
 */

async function debug422() {
  console.log("🔍 Debugging 422 error...");
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'debug422@example.com',
        password: 'password123',
        name: 'Debug User'
      })
    });

    console.log("📊 Status:", response.status);
    console.log("📊 Status Text:", response.statusText);
    console.log("📊 Headers:", Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log("📊 Raw Response:", responseText);
    
    if (response.status === 422) {
      console.log("🔍 422 Error Details:");
      try {
        const errorData = JSON.parse(responseText);
        console.log("📋 Parsed Error:", errorData);
      } catch (e) {
        console.log("❌ Could not parse as JSON");
      }
    }

  } catch (error) {
    console.error("❌ Request failed:", error);
  }
}

debug422();
