// Function to generate JWT token
async function generateJWT() {
    const payload = {
      // Add any data you want in the payload (e.g., user info)
      userId: unique_user_email,
      role: 'source_user',
    };
    const token = await createJWT(payload, clientId);
    return token;
  }
  
  async function createJWT(payload, secret) {
    const header = {
        alg: "HS256",
        typ: "JWT"
    };
    function base64UrlEncode(obj) {
        return btoa(JSON.stringify(obj))
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
    }
    function base64UrlEncodeBytes(bytes) {
        return btoa(String.fromCharCode(...new Uint8Array(bytes)))
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
    }
    const headerEncoded = base64UrlEncode(header);
    const payloadEncoded = base64UrlEncode(payload);
    const data = `${headerEncoded}.${payloadEncoded}`;
    // Convert secret to crypto key
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    // Sign the JWT
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(data)
    );
    const signatureEncoded = base64UrlEncodeBytes(signature);
    return `${data}.${signatureEncoded}`;
  }