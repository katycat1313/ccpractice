/**
 * API Key Management Utility
 * Handles storage, retrieval, and validation of Gemini API keys
 */

const API_KEY_STORAGE_KEY = 'gemini_api_key';
const API_KEY_VALIDATED_KEY = 'gemini_api_key_validated';

/**
 * Retrieve the stored API key from localStorage
 * @returns {string|null} The API key or null if not found
 */
export const getApiKey = () => {
    try {
        return localStorage.getItem(API_KEY_STORAGE_KEY);
    } catch (error) {
        console.error('Error retrieving API key:', error);
        return null;
    }
};

/**
 * Save the API key to localStorage
 * @param {string} key - The API key to save
 */
export const setApiKey = (key) => {
    try {
        localStorage.setItem(API_KEY_STORAGE_KEY, key);
        localStorage.setItem(API_KEY_VALIDATED_KEY, 'false');
    } catch (error) {
        console.error('Error saving API key:', error);
        throw new Error('Failed to save API key');
    }
};

/**
 * Mark the API key as validated
 */
export const markApiKeyValidated = () => {
    try {
        localStorage.setItem(API_KEY_VALIDATED_KEY, 'true');
    } catch (error) {
        console.error('Error marking API key as validated:', error);
    }
};

/**
 * Check if the API key has been validated
 * @returns {boolean}
 */
export const isApiKeyValidated = () => {
    try {
        return localStorage.getItem(API_KEY_VALIDATED_KEY) === 'true';
    } catch (error) {
        console.error('Error checking API key validation:', error);
        return false;
    }
};

/**
 * Remove the API key from localStorage
 */
export const clearApiKey = () => {
    try {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
        localStorage.removeItem(API_KEY_VALIDATED_KEY);
    } catch (error) {
        console.error('Error clearing API key:', error);
    }
};

/**
 * Validate an API key by making a test request to Gemini API
 * @param {string} apiKey - The API key to validate
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export const validateApiKey = async (apiKey) => {
    if (!apiKey || apiKey.trim().length === 0) {
        return { valid: false, error: 'API key is required' };
    }

    try {
        // Test the API key with a simple request
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: 'Hello' }]
                    }]
                })
            }
        );

        if (response.ok) {
            return { valid: true };
        } else {
            const error = await response.json();
            return {
                valid: false,
                error: error.error?.message || 'Invalid API key'
            };
        }
    } catch (error) {
        console.error('API key validation error:', error);
        return {
            valid: false,
            error: 'Failed to validate API key. Please check your internet connection.'
        };
    }
};

/**
 * Check if an API key exists and is validated
 * @returns {boolean}
 */
export const hasValidApiKey = () => {
    const key = getApiKey();
    return key !== null && key.length > 0 && isApiKeyValidated();
};
