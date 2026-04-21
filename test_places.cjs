// No import needed for fetch in Node 18+

async function testPlaces() {
  const apiKey = "AIzaSyD2GQw479doPnxIryfaBkEYkUGE7SjHi3k"; // User's key
  
  const queries = ["melhores hotéis em maraba", "restaurantes bem avaliados em maraba", "principais atrações turísticas em maraba"];
  
  for (const q of queries) {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.userRatingCount"
        },
        body: JSON.stringify({
          textQuery: q,
          languageCode: "pt-BR"
        })
      });
      
      if (!response.ok) {
        console.error("Error for", q, await response.text());
        continue;
      }
      
      const data = await response.json();
      console.log(`\n=== RESULTS FOR: ${q} ===`);
      console.log(JSON.stringify(data.places?.slice(0,2), null, 2));
  }
}

testPlaces();
