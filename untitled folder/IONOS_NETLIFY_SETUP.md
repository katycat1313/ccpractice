# IONOS → Netlify Subdomain Setup Guide

## Complete Step-by-Step Process

### STEP 1: Deploy to Netlify First (Get DNS Info)

1. **Go to** https://app.netlify.com
2. **Sign in/Create account**
3. **Drag & drop** your entire folder: `/Users/katycat/ccpractice/untitled folder/`
4. **Wait** ~30 seconds for deployment
5. **Your site is live!** (e.g., `random-name-123.netlify.app`)

---

### STEP 2: Get Netlify DNS Information

1. **In Netlify**, click on your deployed site
2. **Go to:** Site settings → Domain management
3. **Click:** "Add custom domain"
4. **Enter your subdomain:** `prompts.yourdomain.com` (replace with your actual domain)
5. **Click:** "Verify"
6. Netlify will show you **DNS configuration needed**

**You'll get ONE of these two options:**

#### Option A: CNAME Record (Most Common)
```
Type: CNAME
Name: prompts
Value: random-name-123.netlify.app
```

#### Option B: A Record (Less Common)
```
Type: A
Name: prompts
Value: 75.2.60.5
```

**Copy these values** - you'll need them for IONOS!

---

### STEP 3: Configure IONOS DNS

1. **Log into** https://www.ionos.com
2. **Navigate to:** Domains & SSL → Your Domain → DNS Settings
3. **Click:** "Add Record"

#### If Netlify gave you CNAME (Option A):
```
Type: CNAME
Hostname: prompts
Points to: your-site-name.netlify.app
TTL: 3600 (or leave default)
```

#### If Netlify gave you A Record (Option B):
```
Type: A
Hostname: prompts
Points to: 75.2.60.5 (the IP Netlify provided)
TTL: 3600 (or leave default)
```

4. **Save** the DNS record
5. **Wait** 5-30 minutes for DNS propagation

---

### STEP 4: Verify in Netlify

1. **Return to** Netlify → Domain settings
2. **Check** if the domain shows as verified
3. Netlify will automatically provision **free SSL certificate** (HTTPS)
4. **Wait** for "HTTPS Certificate provisioned" ✓

---

### STEP 5: Test Your Site

1. **Open browser** and go to: `https://prompts.yourdomain.com`
2. **You should see** EventPrompt Pro!
3. **If not working yet:**
   - Wait 30 more minutes (DNS can be slow)
   - Clear browser cache
   - Try incognito mode

---

## 📋 IONOS DNS Quick Reference

### What to enter in IONOS:

**If using subdomain: `prompts.yourdomain.com`**

| Field | Value |
|-------|-------|
| Type | CNAME |
| Hostname | `prompts` |
| Points to | `your-site-name.netlify.app` |
| TTL | 3600 |

**Important:** 
- Use ONLY `prompts` as hostname (not the full `prompts.yourdomain.com`)
- IONOS automatically adds your domain
- Don't add `http://` or `https://` to the points-to value

---

## 🎯 Recommended Subdomain Names

### Best Choice: `prompts`
**Full URL:** `prompts.yourdomain.com`
- ✅ Short and clear
- ✅ Easy to remember
- ✅ Professional
- ✅ Describes the product

### Alternatives:

**`eventprompts`**
- Full URL: `eventprompts.yourdomain.com`
- More descriptive
- Longer but very clear

**`ai`**
- Full URL: `ai.yourdomain.com`
- Very short
- Modern
- Good if you plan other AI products

**`tools`**
- Full URL: `tools.yourdomain.com`
- Generic (good for multiple products)
- Professional

**`library`**
- Full URL: `library.yourdomain.com`
- Descriptive
- Professional

---

## ⚡ Complete Timeline

| Time | What Happens |
|------|--------------|
| 0 min | Deploy to Netlify |
| 2 min | Get DNS info from Netlify |
| 5 min | Add DNS record in IONOS |
| 5-30 min | DNS propagation |
| 30-60 min | SSL certificate provisioned |
| **Done!** | Site live at `prompts.yourdomain.com` |

---

## 🔧 Troubleshooting

### "Domain not found" after 30 minutes

**Check IONOS DNS:**
1. Go back to IONOS DNS settings
2. Verify record is saved
3. Check for typos in hostname or target

**Common mistakes:**
- ❌ Using `prompts.yourdomain.com` as hostname (should be just `prompts`)
- ❌ Adding `https://` to the target (should be just the domain)
- ❌ Wrong record type (should be CNAME, not A)

### SSL Certificate not provisioning

1. Make sure DNS is propagated (check with: https://dnschecker.org)
2. In Netlify: Domain settings → "Verify DNS configuration"
3. If still failing after 2 hours, remove and re-add the domain

### IONOS-specific notes

- IONOS DNS can take 30-60 minutes to propagate (slower than others)
- Make sure you're editing the correct domain if you have multiple
- IONOS sometimes requires clicking "Activate" after saving DNS

---

## 📝 Quick Checklist

Before starting:
- [ ] Have IONOS login ready
- [ ] Know your main domain name
- [ ] Decided on subdomain name (recommended: `prompts`)

Deployment:
- [ ] Deploy to Netlify
- [ ] Add custom domain in Netlify
- [ ] Copy DNS info (CNAME or A record)

IONOS Setup:
- [ ] Login to IONOS
- [ ] Navigate to DNS settings
- [ ] Add CNAME record with Netlify info
- [ ] Save and wait

Verification:
- [ ] Check Netlify domain verification
- [ ] Wait for SSL certificate
- [ ] Test site at `prompts.yourdomain.com`
- [ ] Celebrate! 🎉

---

## 🎨 After Going Live

**Link from your main site:**

Add a link in your main site's navigation:
```html
<a href="https://prompts.yourdomain.com">AI Prompts</a>
```

**Or create a dedicated section:**
```html
<div class="product-card">
  <h3>EventPrompt Pro</h3>
  <p>55+ AI prompts for event planners</p>
  <a href="https://prompts.yourdomain.com">
    Explore Library →
  </a>
</div>
```

---

## 💡 Pro Tips

1. **Test before DNS:** Use the Netlify URL first to make sure everything works
2. **HTTPS will be automatic:** Netlify provides free SSL - no configuration needed
3. **Update Stripe emails:** After live, update any hardcoded URLs in Stripe emails
4. **Update app.js:** If you reference your domain anywhere, update it
5. **Analytics:** Consider adding Google Analytics once live

**Your site will be at:** `https://prompts.yourdomain.com`

---

**Estimated total time:** 45-60 minutes (including DNS wait)
