# Encrypted Storage - Quick Reference

## What Changed?
Your OpenAI API key is now stored in an **encrypted file** instead of Windows Credential Manager.

## File Location
The encrypted key is stored at:
```
{data-folder}/keystore.enc
```

Default locations:
- **AppData**: `C:\Users\{username}\AppData\Roaming\Squailor\data\keystore.enc`
- **Local App**: `{app-location}\data\keystore.enc`
- **Custom**: `{your-choice}\data\keystore.enc`

## Security Features
✅ **AES-256-GCM** encryption (military-grade)
✅ **Machine-specific** - Won't work on other computers
✅ **No plaintext** - API key is never stored unencrypted
✅ **Authentication** - Detects tampering attempts

## How It Works

### Saving Your API Key
1. Enter your OpenAI API key in Settings
2. Click "Save API Key"
3. Key is encrypted using machine-specific information
4. Encrypted data is saved to `keystore.enc`

### Loading Your API Key
1. App starts automatically
2. Reads `keystore.enc` file
3. Decrypts using machine-specific key
4. API key is ready to use

### What Makes It Machine-Specific?
The encryption key is derived from:
- Your computer's hostname
- Operating system (Windows, macOS, Linux)
- CPU architecture (x64, arm64, etc.)
- Your username

This means if you copy the `keystore.enc` file to another computer, it **cannot be decrypted**.

## Common Scenarios

### ✅ Same Computer, Same User
- Works perfectly
- API key loads automatically

### ❌ Different Computer
- Cannot decrypt
- You need to re-enter your API key

### ❌ Same Computer, Different User
- Cannot decrypt
- Each user needs their own API key

### ❌ Computer Name Changed
- Cannot decrypt
- You need to re-enter your API key

### ❌ Username Changed
- Cannot decrypt
- You need to re-enter your API key

## Backup and Restore

### Can I Backup keystore.enc?
Yes, but it will **only work on the same machine**.

### Moving to a New Computer?
1. Note down or backup your actual API key (from OpenAI dashboard)
2. Install Squailor on the new computer
3. Re-enter your API key in Settings
4. A new encrypted keystore will be created

### Changing Storage Location?
No problem! The app automatically moves `keystore.enc` when you change storage locations in Settings.

## Troubleshooting

### "Failed to load API key"
**Cause**: The encrypted file cannot be decrypted
**Solution**: 
1. Go to Settings
2. Re-enter your API key
3. Click "Save API Key"

### "Encryption validation failed"
**Cause**: System cryptography is not working
**Solution**: Reinstall the app or update Node.js/Electron

### API key not saved after restart
**Cause**: The keystore file was deleted or corrupted
**Solution**:
1. Check if `keystore.enc` exists in your data folder
2. If not, re-enter your API key
3. Verify the data folder has write permissions

### Want to remove stored key?
1. Delete `keystore.enc` from the data folder, OR
2. Use "Clear API Key" button in Settings (if implemented)

## For Developers

### Encrypt Custom Data
```javascript
const { encrypt, decrypt } = require('./utils/encryption');

// Encrypt
const encrypted = encrypt('my-sensitive-data');

// Decrypt
const decrypted = decrypt(encrypted);
```

### Validate Encryption
```javascript
const { validateEncryption } = require('./utils/encryption');

if (validateEncryption()) {
  console.log('Encryption is working!');
}
```

## Privacy Note
- Your API key never leaves your computer
- It's not sent to any server (except OpenAI when making AI requests)
- The encrypted file is only readable by you on your machine
- We don't have access to your API key

## Questions?

**Is this secure?**
Yes, we use industry-standard AES-256-GCM encryption with machine-specific key derivation.

**Can others decrypt my key?**
No, even if they get the `keystore.enc` file, they cannot decrypt it without:
- Your exact computer
- Your exact username
- Physical access to your machine

**What if I forget my API key?**
You can get it from your OpenAI dashboard: https://platform.openai.com/api-keys

**Can I use the same API key on multiple computers?**
Yes, but you need to enter it separately on each computer. The encrypted storage is machine-specific.

## Summary
✅ Your API key is encrypted and safe
✅ Automatically loads when you start the app
✅ Machine-specific for extra security
✅ No need for Windows Credential Manager
✅ Works on all platforms (Windows, macOS, Linux)
