'use strict';

const REPRESENTATIONS = ['text/html', 'text/markdown'];

function parseAccept(header) {
    if (!header || !header.trim()) return [];

    return header.split(',').map((part, position) => {
        const segments = part.trim().split(';');
        const mediaType = segments.shift().trim().toLowerCase();
        let q = 1;

        for (const segment of segments) {
            const [name, value] = segment.trim().split('=');
            if (name && name.toLowerCase() === 'q') {
                const parsed = Number(value);
                q = Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
            }
        }

        const specificity = mediaType === '*/*' ? 0 : mediaType.endsWith('/*') ? 1 : 2;
        return { mediaType, q, specificity, position };
    }).filter(entry => entry.mediaType.includes('/'));
}

function matches(range, candidate) {
    if (range === '*/*') return true;
    if (range.endsWith('/*')) return candidate.startsWith(range.slice(0, -1));
    return range === candidate;
}

function preferredType(header) {
    if (!header || !header.trim()) return 'text/html';
    const accepted = parseAccept(header);
    let winner = null;

    for (const candidate of REPRESENTATIONS) {
        let bestMatch = null;
        for (const entry of accepted) {
            if (!matches(entry.mediaType, candidate)) continue;
            if (!bestMatch || entry.specificity > bestMatch.specificity ||
                (entry.specificity === bestMatch.specificity && entry.position < bestMatch.position)) {
                bestMatch = entry;
            }
        }

        if (!bestMatch || bestMatch.q <= 0) continue;
        if (!winner || bestMatch.q > winner.q ||
            (bestMatch.q === winner.q && bestMatch.position < winner.position)) {
            winner = { type: candidate, q: bestMatch.q, position: bestMatch.position };
        }
    }

    return winner ? winner.type : null;
}

module.exports = { parseAccept, preferredType };
