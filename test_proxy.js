//

async function testProxy() {
  const url = `https://corsproxy.io/?${encodeURIComponent("https://places.googleapis.com/v1/places:searchText")}`;
  const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": "AIzaSyC3XMug62lrEQgHBwtrgR7So4D793p10F0",
        "X-Goog-FieldMask": "places.displayName"
      },
      body: JSON.stringify({textQuery: "hotel in Paris", languageCode: "en"})
  });
  console.log(response.status);
  console.log(await response.text());
}
testProxy();
