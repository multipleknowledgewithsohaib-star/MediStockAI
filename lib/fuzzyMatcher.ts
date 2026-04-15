export interface MatchableProduct {
    id: string | number;
    name: string;
    item_code?: string | null;
    aliases?: string[];
}

function extractLeadToken(value: string) {
    const match = String(value || "").toUpperCase().match(/[A-Z0-9]+/);
    return match ? match[0] : "";
}

export function fuzzyMatchProduct(inputName: string, products: MatchableProduct[]) {
    if (!inputName || !products || products.length === 0) return null;

    const cleanInput = inputName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const inputLeadToken = extractLeadToken(inputName);
    let bestMatch: MatchableProduct | null = null;
    let highestScore = 0;
    let bestMatchedOn = "";
    let bestMatchType = "";

    const checkMatch = (str: string, product: MatchableProduct, matchType: string) => {
        if (!str) return;
        const cleanStr = str.toLowerCase().replace(/[^a-z0-9]/g, '');
        const candidateLeadToken = extractLeadToken(str);
        
        // 1. Calculate similarity score (0-100)
        let score = calculateSimilarity(cleanInput, cleanStr);
        
        // 2. Substring/Prefix Boost (e.g. "Ezium" in "Ezium 20mg")
        if (cleanInput.length > 2 && cleanStr.length > 2) {
            // Case 1: Database name is inside Invoice name (e.g. "Ezium" in "Ezium 20mg")
            // Case 2: Invoice name is inside Database name (e.g. "Ezium 20mg" in "Ezium Tablet 20mg")
            if (cleanStr.includes(cleanInput) || cleanInput.includes(cleanStr)) {
                const subScore = Math.min(cleanInput.length, cleanStr.length) / Math.max(cleanInput.length, cleanStr.length) * 100;
                // Boost for significant substring overlap (at least 60% of short string)
                score = Math.max(score, subScore > 40 ? 85 : 0);
            }
        }

        const exactLeadTokenMatch = inputLeadToken && candidateLeadToken && inputLeadToken === candidateLeadToken;
        if (!exactLeadTokenMatch && score < 85) {
            return;
        }

        if (score > highestScore) {
            highestScore = score;
            bestMatch = product;
            bestMatchedOn = str;
            bestMatchType = matchType;
        }
    };

    for (const prod of products) {
        // Direct match on Name
        checkMatch(prod.name, prod, "Name");
        
        // Match on Aliases
        if (prod.aliases && Array.isArray(prod.aliases)) {
            for (const alias of prod.aliases) {
                checkMatch(alias, prod, "Alias");
            }
        }
    }

    if (highestScore >= 75 && bestMatch) {
        return {
            productId: (bestMatch as MatchableProduct).id,
            score: highestScore,
            type: bestMatchType,
            matchedOn: bestMatchedOn
        };
    }

    return null;
}

// Simple Jaccard/Dice-like similarity coefficient using bigrams
function calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 100;
    if (str1.length < 2 || str2.length < 2) return 0;
    
    const getBigrams = (str: string) => {
        const bigrams = new Set<string>();
        for (let i = 0; i < str.length - 1; i++) {
            bigrams.add(str.substring(i, i + 2));
        }
        return bigrams;
    };
    
    const bg1 = getBigrams(str1);
    const bg2 = getBigrams(str2);
    
    let intersectionSize = 0;
    for (const bg of bg1) {
        if (bg2.has(bg)) {
            intersectionSize++;
        }
    }
    
    const diceCoefficient = (2.0 * intersectionSize) / (bg1.size + bg2.size);
    return Math.round(diceCoefficient * 100);
}
