/**
 * Compare two version strings
 * @param {string} v1 - First version string
 * @param {string} v2 - Second version string
 * @returns {number} 
 * - 1 if v1 is newer
 * - -1 if v2 is newer
 * - 0 if versions are equal
 */
export function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;
        
        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }
    
    return 0;
} 