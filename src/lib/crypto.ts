export class CryptoUtils {
  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encryptAESGCM(
    key: CryptoKey,
    data: Uint8Array,
    nonce: Uint8Array,
    aad?: Uint8Array
  ): Promise<Uint8Array> {
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
        additionalData: aad,
        tagLength: 128
      },
      key,
      data
    );
    return new Uint8Array(encrypted);
  }

  static async decryptAESGCM(
    key: CryptoKey,
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    aad?: Uint8Array
  ): Promise<Uint8Array> {
    try {
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: nonce,
          additionalData: aad,
          tagLength: 128
        },
        key,
        ciphertext
      );
      return new Uint8Array(decrypted);
    } catch (error) {
      throw new Error('Decryption failed: authentication tag verification failed');
    }
  }

  static generateNonce(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(12));
  }

  static async sha256(data: Uint8Array | string): Promise<string> {
    const buffer = typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data;
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async hmacSHA256(
    secret: string,
    data: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(data)
    );
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async verifyHMAC(
    secret: string,
    data: string,
    signature: string
  ): Promise<boolean> {
    const expected = await this.hmacSHA256(secret, data);
    return this.timingSafeEqual(expected, signature);
  }

  static async deriveKeyFromPassword(
    username: string,
    password: string,
    salt?: Uint8Array
  ): Promise<{ key: CryptoKey; salt: Uint8Array }> {
    const encoder = new TextEncoder();
    const combinedInput = encoder.encode(username + ':' + password);

    const useSalt = salt || crypto.getRandomValues(new Uint8Array(16));

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      combinedInput,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: useSalt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    return { key, salt: useSalt };
  }

  static async decryptWithPassword(
    username: string,
    password: string,
    encryptedData: Uint8Array,
    iv: Uint8Array,
    salt: Uint8Array
  ): Promise<Uint8Array> {
    const { key } = await this.deriveKeyFromPassword(username, password, salt);
    return await this.decryptAESGCM(key, encryptedData, iv);
  }

  private static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  static generateAPIKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return 'sk_' + Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  static async importKey(keyString: string): Promise<CryptoKey> {
    const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
}
