// GMAT Club Search Service - Find discussion threads for questions
// Uses DuckDuckGo to search site:gmatclub.com

interface SearchResult {
    title: string;
    url: string;
    snippet: string;
}

// Extract keywords from question text (remove common words)
function extractKeywords(text: string): string {
    const stopWords = new Set([
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
        'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
        'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
        'below', 'between', 'under', 'again', 'further', 'then', 'once',
        'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few',
        'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
        'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but',
        'if', 'or', 'because', 'until', 'while', 'although', 'though',
        'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
        'am', 'it', 'its', 'he', 'she', 'they', 'them', 'their', 'his', 'her',
        'following', 'statement', 'statements', 'question', 'answer', 'option',
    ]);

    // Clean and tokenize
    const words = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));

    // Take first 8 unique keywords
    const unique = [...new Set(words)].slice(0, 8);
    return unique.join(' ');
}

// Search GMAT Club via DuckDuckGo
export async function searchGmatClub(questionText: string): Promise<SearchResult[]> {
    try {
        const keywords = extractKeywords(questionText);
        if (!keywords) {
            return [];
        }

        const query = encodeURIComponent(`site:gmatclub.com ${keywords}`);
        const url = `https://html.duckduckgo.com/html/?q=${query}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            },
        });

        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }

        const html = await response.text();

        // Parse results from HTML
        const results: SearchResult[] = [];

        // Match result links and titles
        const linkPattern = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
        const snippetPattern = /<a[^>]+class="result__snippet"[^>]*>([^<]+)<\/a>/gi;

        let match;
        const links: { url: string; title: string }[] = [];

        while ((match = linkPattern.exec(html)) !== null) {
            let resultUrl = match[1];
            const title = match[2].trim();

            // DuckDuckGo wraps URLs, extract actual URL
            if (resultUrl.includes('uddg=')) {
                const uddgMatch = resultUrl.match(/uddg=([^&]+)/);
                if (uddgMatch) {
                    resultUrl = decodeURIComponent(uddgMatch[1]);
                }
            }

            // Only include GMAT Club forum links
            if (resultUrl.includes('gmatclub.com/forum')) {
                links.push({ url: resultUrl, title });
            }
        }

        // Extract snippets
        const snippets: string[] = [];
        while ((match = snippetPattern.exec(html)) !== null) {
            snippets.push(match[1].trim());
        }

        // Combine into results (top 3)
        for (let i = 0; i < Math.min(links.length, 3); i++) {
            results.push({
                title: links[i].title,
                url: links[i].url,
                snippet: snippets[i] || '',
            });
        }

        return results;
    } catch (error) {
        console.error('GMAT Club search error:', error);
        return [];
    }
}

// Alternative: Build direct GMAT Club search URL for user to open
export function buildGmatClubSearchUrl(questionText: string): string {
    const keywords = extractKeywords(questionText);
    const query = encodeURIComponent(keywords);
    return `https://gmatclub.com/forum/search.php?search=${query}`;
}
