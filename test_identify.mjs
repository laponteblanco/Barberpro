async function test() {
  console.log("=== TESTING LOCAL IDENTIFY API ENDPOINT ===");
  try {
    const res = await fetch('http://localhost:3000/api/tenants/c88f1146-24e5-42bd-9ca7-009772ee83c4/clients/identify?id_number=12345');
    console.log("Status:", res.status);
    const contentType = res.headers.get("content-type");
    console.log("Content-Type:", contentType);
    
    if (res.ok) {
      const data = await res.json();
      console.log("Response Data:", JSON.stringify(data, null, 2));
    } else {
      console.error("API failed with error:", await res.text());
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

test();
