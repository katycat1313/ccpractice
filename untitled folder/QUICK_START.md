# EventPrompt Pro - Deployment & Monetization Guide

## 💰 PRICING RECOMMENDATION

**$29 one-time payment** (Start here - it's the simplest!)

### Why $29?
- Event planners charge $3K-$10K per event → $29 is a no-brainer ROI
- One-time = less friction than subscription
- Easier to manage (no recurring billing)
- Higher conversion rate than monthly pricing


---

## 🚀 3-STEP SETUP TO START SELLING

### STEP 1: Create Stripe Payment Link (5 minutes)

1. **Go to** https://stripe.com and create account
2. **Click** "Payment Links" in sidebar → "New"
3. **Fill in:**
   - Product: "EventPrompt Pro - Premium Access"
   - Price: $29.00 USD (one-time)
   - Description: "Unlock 55+ premium AI prompts for wedding & event planners"
4. **Copy** your payment link (looks like: `https://buy.stripe.com/xxxxx`)

### STEP 2: Add Stripe Link to Your Site

Open `/Users/katycat/ccpractice/untitled folder/app.js`

Find line ~1900 and replace:
```javascript
const stripePaymentLink = 'PASTE_YOUR_STRIPE_LINK_HERE';
```

With your actual link:
```javascript
const stripePaymentLink = 'https://buy.stripe.com/YOUR_ACTUAL_LINK';
```

### STEP 3: Post-Purchase Access

**Simple Method** (recommended to start):

After purchase, customers get a license key via email. 

In Stripe:
- Go to Settings → Emails → Receipts  
- Add this to receipt:

```
YOUR LICENSE KEY: PREMIUM2024

To unlock:
1. Visit your site
2. Click "Already purchased? Unlock here"  
3. Enter: PREMIUM2024
```

**The "Already purch

ased? Unlock here" button is already added to your site!**

---

## 🌐 DEPLOYMENT TO NETLIFY

### Option 1: Drag & Drop (Easiest - 2 minutes)

1. Go to https://app.netlify.com
2. Sign up/login
3. Drag the entire `untitled folder` onto the page
4. Done! You get a live URL like `random-name.netlify.app`

### Option 2: Custom Domain (Professional)

After deploying:
1. Buy domain at Namecheap (e.g. `eventpromptpro.com` - $12/year)
2. In Netlify: Site Settings → Domain → Add custom domain
3. Follow DNS instructions
4. Your site is live at your custom domain!

---

## 🏗️ ARCHITECTURE DECISION

### RECOMMENDED: Standalone Product Site

**Deploy EventPrompt Pro to its own domain:**
- `eventpromptpro.com` (or similar)
- The current `index.html` already IS a complete landing page!
- No need for separate sales page
- Everything is built-in: hero, features, library, pricing

**Benefits:**
✅ Focused product site
✅ Better SEO for niche keywords  
✅ Can run paid ads
✅ Professional feel

### Alternative: Subdomain

If you have an existing site:
- Deploy to `prompts.yourdomain.com`
- Link from main site navigation

---

## 📧 POST-PURCHASE EMAIL (Set in Stripe)

```
Subject: Welcome to EventPrompt Pro! 🎉

Hi [Name],

Thank you for your purchase!

YOUR LICENSE KEY: PREMIUM2024

How to unlock all prompts:
1. Visit https://eventpromptpro.com
2. Scroll to bottom and click "Already purchased? Unlock here"
3. Enter your license key

You now have lifetime access to:
✓ All 55+ premium prompts
✓ Variable customization
✓ Future updates (free)
✓ Priority support

Questions? Just reply to this email!

Happy planning,
[Your Name]
```

---

## 🎯 QUICK START CHECKLIST

- [ ] Create Stripe account
- [ ] Create $29 payment link
- [ ] Add Stripe link to `app.js` (line ~1900)
- [ ] Test with Stripe test mode (card: 4242 4242 4242 4242)
- [ ] Deploy to Netlify (drag & drop)
- [ ] Test live payment
- [ ] Set up receipt email in Stripe
- [ ] Switch to live mode
- [ ] LAUNCH! 🚀

---

## 💡 MARKETING QUICK WINS

1. **Free lead magnet**: Share 3 best prompts on Instagram
2. **Facebook groups**: Post in wedding planner communities
3. **SEO blog**: "50 ChatGPT Prompts for Event Planners"
4. **Pinterest**: Create shareable prompt cards
5. **Email signature**: Add link to product

**Estimated time to first sale:** 1-2 weeks

---

## 📁 FILES YOU HAVE

Everything is ready in: `/Users/katycat/ccpractice/untitled folder/`

- ✅ `index.html` - Complete landing page + product
- ✅ `styles.css` - Premium design
- ✅ `app.js` - 55+ prompts + functionality
- ✅ `netlify.toml` - Deployment config
- ✅ `DEPLOYMENT_GUIDE.md` - Full documentation

**You're production-ready!** Just add your Stripe link and deploy.

---

## 🔧 SUPPORT

**Need help?**
- Check `DEPLOYMENT_GUIDE.md` for detailed instructions
- Test locally: Just open `index.html` in browser
- Stripe docs: https://stripe.com/docs/payment-links

**Common issues:**
- Can't find Stripe link? Check dashboard.stripe.com/payment-links
- App not working? Make sure all 3 files (html, css, js) are in same folder
- License key not working? Clear browser cache and try incognito

---

## 💰 REVENUE POTENTIAL

**Conservative Year 1:**
- 100 sales × $29 = $2,900

**Moderate Year 1:**
- 500 sales × $29 = $14,500

**With marketing:**
- 1,000+ sales × $29 = $29,000+

Event planning is a $5 billion industry with 100,000+ active planners. This is a fraction of the market!
