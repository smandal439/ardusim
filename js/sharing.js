/**
 * ArduSim Project Sharing Module
 * Enables 1-click URL state serialization & deserialization.
 */

// Uses native base64 + URI encoding (or integrate lz-string for smaller URLs)
export const ProjectSharer = {
  /**
   * Encodes current project state into a URL string
   * @param {Object} circuitData - Component positions, wiring array, etc.
   * @param {string} codeText - Arduino C++ source code
   * @returns {string} Full shareable URL
   */
  encodeToUrl(circuitData, codeText) {
    const payload = {
      v: 1, // Schema version
      code: codeText,
      circuit: circuitData
    };
    
    const jsonString = JSON.stringify(payload);
    // Base64 encode after handling UTF-8 characters
    const encoded = btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g,
      (match, p1) => String.fromCharCode('0x' + p1)
    ));
    
    const shareableUrl = `${window.location.origin}${window.location.pathname}#project=${encoded}`;
    if (shareableUrl.length > 8000) {
      console.warn('[Sharing] URL length ' + shareableUrl.length + ' exceeds 8000 characters — may not work in all browsers');
    }
    return shareableUrl;
  },

  /**
   * Parses the URL hash and returns the saved state if present
   * @returns {Object|null} { code, circuit } or null if no hash found
   */
  decodeFromUrl() {
    const hash = window.location.hash;
    if (!hash.includes('#project=')) return null;

    try {
      const base64Data = hash.split('#project=')[1];
      const jsonString = decodeURIComponent(
        Array.prototype.map.call(atob(base64Data), c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')
      );
      
      const payload = JSON.parse(jsonString);
      return payload;
    } catch (err) {
      console.error("Failed to parse project from URL hash:", err);
      return null;
    }
  },

  /**
   * Helper to copy URL to clipboard and show feedback
   */
  async copyShareLink(circuitData, codeText) {
    const url = this.encodeToUrl(circuitData, codeText);
    await navigator.clipboard.writeText(url);
    return url;
  }
};