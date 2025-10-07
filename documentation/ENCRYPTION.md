# Encrypted Storage Implementation

## Overview
The OpenAI API key is now stored in an encrypted file within the data folder instead of using Windows Credential Manager. This ensures cross-platform compatibility and gives users more control over where their sensitive data is stored.

## Security Features

### Encryption Algorithm
- **Algorithm**: AES-256-GCM (Advanced Encryption Standard with Galois/Counter Mode)
- **Key Length**: 256 bits (32 bytes)
- **IV Length**: 128 bits (16 bytes)
- **Authentication**: Built-in authentication tag for integrity verification

### Machine-Specific Encryption
The encryption key is derived from machine-specific information:
- Hostname
- Platform (Windows, macOS, Linux)
- Architecture (x64, arm64, etc.)
- Username

This means:
- ✅ The encrypted key file is **tied to the specific machine**
- ✅ Cannot be decrypted on a different computer
- ✅ Cannot be decrypted by a different user on the same machine
- ✅ Provides protection even if the data folder is copied elsewhere

### Key Derivation
- Uses **PBKDF2** (Password-Based Key Derivation Function 2)
- 100,000 iterations for strong key stretching
- Random 64-byte salt generated for each encryption
- SHA-256 hash function

## File Structure

### Data Folder Layout
```
data/
├── documents/          # Stored uploaded files
├── settings.json       # App settings (theme, storage location, etc.)
└── keystore.enc       # Encrypted API key file
```

### Keystore File Format
The `keystore.enc` file contains:
1. **Salt** (64 bytes) - Random salt for key derivation
2. **IV** (16 bytes) - Initialization vector for encryption
3. **Auth Tag** (16 bytes) - GCM authentication tag
4. **Encrypted Data** - The actual encrypted API key

All data is base64 encoded for safe storage.

## Storage Locations

Users can choose where the data folder is stored:

1. **AppData** (Default)
   - Windows: `C:\Users\{username}\AppData\Roaming\Squailor\data\`
   - macOS: `~/Library/Application Support/Squailor/data/`
   - Linux: `~/.config/Squailor/data/`

2. **Local App Folder**
   - Stored alongside the application files
   - Path: `{app-location}/data/`

3. **Custom Location**
   - User-selected folder
   - Path: `{custom-path}/data/`

When changing storage locations, all files (including the encrypted keystore) are automatically moved.

## Implementation Details

### Encryption Utility (`utils/encryption.js`)

#### `encrypt(text)`
Encrypts the provided text using AES-256-GCM with a machine-specific key.

```javascript
const { encrypt } = require('./utils/encryption');
const encrypted = encrypt('my-api-key');
```

#### `decrypt(encryptedData)`
Decrypts data that was encrypted with the `encrypt()` function.

```javascript
const { decrypt } = require('./utils/encryption');
const decrypted = decrypt(encryptedData);
```

#### `validateEncryption()`
Tests that encryption/decryption is working correctly.

```javascript
const { validateEncryption } = require('./utils/encryption');
if (validateEncryption()) {
  console.log('Encryption is working!');
}
```

### IPC Handlers

#### `save-api-key`
Encrypts and saves the API key to the keystore file.

```javascript
const result = await window.electronAPI.saveApiKey(apiKey);
if (result.success) {
  console.log('API key saved securely!');
}
```

#### `load-api-key`
Loads and decrypts the API key from the keystore file.

```javascript
const result = await window.electronAPI.loadApiKey();
if (result.success) {
  const apiKey = result.apiKey;
}
```

#### `delete-api-key`
Deletes the keystore file, removing the stored API key.

```javascript
const result = await window.electronAPI.deleteApiKey();
```

## Migration from Keytar

The app has been updated to remove the dependency on `keytar` (Windows Credential Manager). 

### For Existing Users
If you had previously saved an API key using the old system:
1. The app will not automatically migrate the key
2. You'll need to re-enter your API key in the Settings page
3. The new key will be saved using the encrypted file storage

## Security Considerations

### Strengths
- ✅ Strong encryption (AES-256-GCM)
- ✅ Machine-specific key derivation
- ✅ Authentication tag prevents tampering
- ✅ Random IV and salt for each encryption
- ✅ No plaintext storage
- ✅ Cross-platform compatibility

### Limitations
- ⚠️ Security depends on the physical security of the machine
- ⚠️ Root/admin users may be able to access the encryption key derivation data
- ⚠️ If the machine's hostname/username changes, the key cannot be decrypted
- ⚠️ No password protection (relies on OS user authentication)

### Best Practices
1. **Keep your data folder secure** - Don't store it on shared drives
2. **Use OS-level protection** - Enable full disk encryption (BitLocker, FileVault, etc.)
3. **Restrict file permissions** - The data folder should only be accessible to your user
4. **Backup carefully** - Remember that keystore.enc won't work on other machines
5. **Keep your API key safe** - Regenerate it if you suspect it's been compromised

## Troubleshooting

### "Failed to load API key"
- The keystore file may be corrupted
- The machine information may have changed (hostname, username)
- Solution: Delete `keystore.enc` and re-enter your API key

### "Encryption validation failed"
- The crypto module is not available
- The Node.js installation is missing required cryptography support
- Solution: Ensure you're using a recent version of Node.js/Electron

### "Cannot decrypt on new machine"
- This is expected behavior - the encryption is machine-specific
- Solution: Re-enter your API key on the new machine

## Technical Notes

### Why Not Use Keytar?
While `keytar` provides OS-native credential storage, it has several drawbacks:
- Platform-dependent (requires native compilation)
- Not available on all systems (requires credential manager)
- Users don't control where data is stored
- Can be more complex to build/deploy

### Why Machine-Specific Encryption?
- Prevents the data folder from being copied to another machine and decrypted
- Provides an additional layer of security beyond file system permissions
- No need for users to remember/enter a master password

### Future Enhancements
Possible improvements for future versions:
- Optional password-based encryption (in addition to machine-specific)
- Key rotation capabilities
- Encrypted storage for other sensitive settings
- Backup/restore with password protection
