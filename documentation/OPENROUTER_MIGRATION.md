# OpenRouter Integration - Migration Guide

## What Changed?

Squailor now uses **OpenRouter** instead of OpenAI directly! This gives you access to **100+ AI models** from multiple providers through a single API key.

## Why OpenRouter?

✅ **100+ Models** - Access OpenAI, Anthropic, Google, Meta, and more  
✅ **Better Pricing** - Often cheaper than going direct  
✅ **More Options** - Choose the best model for your needs  
✅ **One API Key** - No need to manage multiple API keys  
✅ **Fallback Support** - If one model is down, use another  
✅ **Free Credits** - Get $1 in free credits to start  

## Getting Your OpenRouter API Key

1. Go to [https://openrouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Go to [https://openrouter.ai/keys](https://openrouter.ai/keys)
4. Click "Create Key"
5. Copy your API key (starts with `sk-or-v1-...`)
6. Paste it into Squailor's Settings

## Available Models

### OpenAI Models (via OpenRouter)
- **GPT-4o Mini** - Fast, cheap, great quality (Recommended) 💰
- **GPT-4o** - Most capable OpenAI model
- **GPT-4 Turbo** - Previous generation flagship
- **GPT-3.5 Turbo** - Fastest and cheapest

### Anthropic Claude Models
- **Claude 3.5 Sonnet** - Excellent for detailed summaries 🌟
- **Claude 3 Opus** - Best reasoning capabilities
- **Claude 3 Haiku** - Fast and economical

### Google Gemini Models
- **Gemini 1.5 Pro** - Large context window
- **Gemini 1.5 Flash** - Very fast, cost-effective ⚡

### Meta Llama Models (Open Source)
- **Llama 3.1 70B** - Powerful open model
- **Llama 3.1 8B** - Very cheap, decent quality 💰

### Other Notable Models
- **Mistral Large** - European AI provider
- **Perplexity Sonar** - Includes real-time web access 🌐

## Pricing Comparison

### Per 1M Tokens (Approximate)

| Model | Input | Output | Best For |
|-------|-------|--------|----------|
| GPT-4o Mini | $0.15 | $0.60 | Daily use, great value |
| Claude 3.5 Sonnet | $3.00 | $15.00 | Detailed work |
| Gemini Flash | $0.08 | $0.30 | Speed + cost |
| Llama 3.1 8B | $0.06 | $0.06 | Maximum savings |
| GPT-4o | $2.50 | $10.00 | Premium quality |

💡 **Tip:** Start with GPT-4o Mini or Gemini Flash for the best balance!

Check current pricing: [https://openrouter.ai/models](https://openrouter.ai/models)

## Migration from OpenAI

### If You Were Using OpenAI Directly:

**Old Setup:**
1. OpenAI account
2. OpenAI API key (sk-proj-...)
3. Only OpenAI models

**New Setup:**
1. OpenRouter account
2. OpenRouter API key (sk-or-v1-...)
3. Access to 100+ models including all OpenAI models

### Do I Need to Change Anything?

**Yes, you need to:**
1. Get an OpenRouter API key
2. Enter it in Squailor Settings
3. Choose your preferred model

**Your existing summaries stay intact!** No data is lost.

## Model Selection Guide

### For Most Users: GPT-4o Mini
- Great quality
- Very affordable
- Fast response times
- Good for all document types

### For Detailed Academic Work: Claude 3.5 Sonnet
- Excellent at understanding nuance
- Great for complex documents
- More expensive but worth it for important work

### For Maximum Speed: Gemini Flash
- Fastest responses
- Very cheap
- Good for simple summaries

### For Budget-Conscious: Llama 3.1 8B
- Cheapest option
- Open source
- Decent quality for basic summaries

## Code Changes

### What Was Updated:

1. **utils/aiSummarizer.js** - Points to OpenRouter API
   ```javascript
   const openai = new OpenAI({
     apiKey: apiKey,
     baseURL: 'https://openrouter.ai/api/v1'
   });
   ```

2. **Model Format** - Uses OpenRouter model identifiers
   - Old: `gpt-4o-mini`
   - New: `openai/gpt-4o-mini`

3. **UI Updates** - Settings page now shows all available models

4. **Validation** - API key validation uses OpenRouter endpoint

## Testing Your Setup

1. **Get Free Credits:**
   - OpenRouter gives $1 free to start
   - Process a few test documents

2. **Try Different Models:**
   - Process same document with different models
   - Compare quality vs. cost

3. **Check Usage:**
   - Visit [https://openrouter.ai/activity](https://openrouter.ai/activity)
   - See exactly what you spent

## Troubleshooting

### "Invalid API Key" Error
- Make sure you're using an OpenRouter key (sk-or-v1-...)
- Not an OpenAI key (sk-proj-...)
- Get one at: https://openrouter.ai/keys

### "Model Not Found" Error
- Check model is available on OpenRouter
- Some models require approval
- View models: https://openrouter.ai/models

### Rate Limits
- OpenRouter has its own rate limits
- Different from OpenAI limits
- Usually more generous
- Check: https://openrouter.ai/docs#rate-limits

### Costs Higher Than Expected?
- Check which model you selected
- Some models are pricier than others
- Monitor usage: https://openrouter.ai/activity

## Advanced Features

### Model Fallbacks (Future)
OpenRouter supports fallback models if primary is unavailable:
```javascript
models: ['openai/gpt-4o-mini', 'anthropic/claude-3-haiku']
```

### Route Preferences (Future)
Choose between speed, cost, or quality:
```javascript
route: 'fallback' // or 'cost', 'speed', 'quality'
```

## FAQ

**Q: Can I still use my OpenAI API key?**  
A: No, you need an OpenRouter API key. It's free to sign up!

**Q: Is it more expensive?**  
A: Usually cheaper! OpenRouter negotiates better rates.

**Q: Do I have access to ALL models?**  
A: Most models. Some require special approval.

**Q: Is my data safe?**  
A: OpenRouter follows same privacy standards as OpenAI.

**Q: Can I use free models?**  
A: Yes! Some open-source models are very cheap.

**Q: What if OpenRouter goes down?**  
A: OpenRouter has high uptime. Plus you can switch models easily.

## Support

- **OpenRouter Docs:** https://openrouter.ai/docs
- **Discord:** https://discord.gg/openrouter
- **Status Page:** https://status.openrouter.ai

## Summary

**Before (OpenAI Direct):**
- ❌ Only OpenAI models
- ❌ One API key = one provider
- ❌ Limited options

**After (OpenRouter):**
- ✅ 100+ models from multiple providers
- ✅ One API key = all providers
- ✅ Better pricing
- ✅ More flexibility

**Bottom Line:** OpenRouter gives you more options, better pricing, and access to cutting-edge models from multiple AI labs! 🚀
