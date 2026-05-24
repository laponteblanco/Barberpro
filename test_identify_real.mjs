async function test() {
  console.log("=== TESTING LOCAL IDENTIFY WITH REAL CEDULA ===");
  try {
    const res = await fetch('http://localhost:3000/api/tenants/753bb522-79ba-4334-b5ea-3b558f109735/clients/identify?id_number=1012393887');
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
