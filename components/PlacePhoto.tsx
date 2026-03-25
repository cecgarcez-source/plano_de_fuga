import React, { useEffect, useState } from 'react';

interface PlacePhotoProps {
  query: string;
  className?: string;
  alt?: string;
}

export function PlacePhoto({ query, className = "", alt = "" }: PlacePhotoProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhoto = async () => {
      setLoading(true);
      try {
        // Extract main location name (remove state/country if separated by comma)
        const cleanQuery = query.split(',')[0].trim();
        
        // Use Wikipedia API full text search to find the most relevant article image
        const wikiResponse = await fetch(`https://pt.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageimages&format=json&piprop=original&origin=*`);
        const wikiData = await wikiResponse.json();
        
        let url = null;
        if (wikiData.query && wikiData.query.pages) {
          const pages = Object.values(wikiData.query.pages) as any[];
          if (pages.length > 0 && pages[0].original?.source) {
            url = pages[0].original.source;
          }
        }
        
        // If PT wiki fails, try EN wiki
        if (!url) {
          const enWikiResponse = await fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQuery)}&gsrlimit=1&prop=pageimages&format=json&piprop=original&origin=*`);
          const enWikiData = await enWikiResponse.json();
          if (enWikiData.query && enWikiData.query.pages) {
             const pages = Object.values(enWikiData.query.pages) as any[];
             if (pages.length > 0 && pages[0].original?.source) {
               url = pages[0].original.source;
             }
          }
        }

        if (url) {
          setPhotoUrl(url);
        }
      } catch (err) {
        console.error("Erro ao buscar foto da wikipedia:", err);
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      fetchPhoto();
    }
  }, [query]);

  if (loading) {
    return (
      <div className={`bg-gray-200 animate-pulse flex items-center justify-center text-gray-400 ${className}`}>
        <span>📸</span>
      </div>
    );
  }

  if (!photoUrl) {
    return null; // Don't render anything if no photo found to keep UI clean
  }

  return (
    <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
      <img 
        src={photoUrl} 
        alt={alt || query} 
        className="w-full h-full object-cover select-none"
        loading="lazy"
        crossOrigin="anonymous"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <span className="text-white font-bold text-sm drop-shadow-md flex items-center gap-1">📍 {query}</span>
      </div>
    </div>
  );
}
