# EventPrompt Pro - Deployment Guide

## 🚀 Quick Start: Deploy to Netlify + Stripe

### Step 1: Create Stripe Payment Link (5 minutes)

1. **Sign up for Stripe** (if you don't have an account)
   - Go to https://stripe.com
   - Create account (use your business email)

2. **Create a Payment Link**
   - Log into Stripe Dashboard
   - Click "Payment Links" in left sidebar
   - Click "New" → "Payment Link"
   - Fill in:
     * **Product name**: EventPrompt Pro - Premium Access
     * **Price**: $29.00 USD (one-time payment)
     * **Description**: "Unlock all 55+ premium prompts for wedding & event planners. Lifetime access with updates."
   - Click "Create link"
   - **Copy the payment link** (looks like: `https://buy.stripe.com/xxxxx`)

3. **Optional: Create Monthly Subscription Link**
   - Repeat above but select "Recurring"
   - Price: $9/month
   - Copy this link too

### Step 2: Add Stripe Links to Website

Open `app.js` and find the `handlePurchase()` function (around line 520).

Replace the function with:

```javascript
function handlePurchase(tier) {
    if (tier === 'premium') {
        // Option 1: One-time payment
        const stripeLink = 'YOUR_STRIPE_PAYMENT_LINK_HERE';
        
        // Option 2: Monthly subscription
        // const stripeLink = 'YOUR_STRIPE_MONTHLY_LINK_HERE';
        
        window.open(stripeLink, '_blank');
    } else if (tier === 'pro') {
        // For Pro tier, direct to contact form or Calendly
        window.open('mailto:hello@youremail.com?subject=Pro Tier Inquiry', '_blank');
    }
}
```

**Example with real Stripe link:**
```javascript
function handlePurchase(tier) {
    if (tier === 'premium') {
        window.open('https://buy.stripe.com/test_xxxxxxxxxxxx', '_blank');
    } else if (tier === 'pro') {
        window.open('mailto:hello@eventpromptpro.com?subject=Pro Tier Inquiry', '_blank');
    }
}
```

### Step 3: Handle Post-Purchase Access

**Option A: Simple Manual Unlock (Start Here)**

After purchase, send customers a "license key" via email:

1. In Stripe, enable "Custom text" on payment success
2. Add message: "Your access code: **PREMIUM2024** - Visit eventpromptpro.com and enter this code to unlock."

3. Update `app.js` to accept license key:

```javascript
// Add this function
function unlockWithLicenseKey() {
    const key = prompt('Enter your license key:');
    if (key === 'PREMIUM2024') { // Change this monthly
        isPremiumUser = true;
        localStorage.setItem('eventprompt_premium', 'true');
        renderPrompts();
        alert('🎉 Premium unlocked! All prompts are now available.');
    } else {
        alert('Invalid license key. Please check your purchase email.');
    }
}
```

4. Add button to pricing section in `index.html`:
```html
<button class="pricing-button secondary" onclick="unlockWithLicenseKey()">
    Already purchased? Unlock here
</button>
```

**Option B: Automated with Webhook (Advanced)**

For automatic unlocking, you'd need:
- Backend serverless function (Netlify Functions)
- Stripe webhook to verify purchase
- Database to store customer emails

(Start with Option A, upgrade later when you have sales)

### Step 4: Deploy to Netlify

#### Method 1: Drag & Drop (Easiest)

1. Go to https://app.netlify.com
2. Sign up/login
3. Drag the entire `untitled folder` onto Netlify
4. Done! You'll get a URL like `random-name-123.netlify.app`

#### Method 2: GitHub + Auto Deploy (Professional)

1. **Create GitHub repo:**
   ```bash
   cd "/Users/katycat/ccpractice/untitled folder"
   git init
   git add .
   git commit -m "Initial commit - EventPrompt Pro"
   ```

2. Create repo on GitHub.com (name it "eventprompt-pro")

3. Push code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/eventprompt-pro.git
   git branch -M main
   git push -u origin main
   ```

4. **Connect to Netlify:**
   - In Netlify dashboard, click "Add new site" → "Import an existing project"
   - Choose GitHub
   - Select your repo
   - Build settings:
     * Build command: (leave blank)
     * Publish directory: `.`
   - Click "Deploy"

5. **Custom domain (optional):**
   - Buy domain at Namecheap/Google Domains (e.g., `eventpromptpro.com` - ~$12/year)
   - In Netlify: Site settings → Domain management → Add custom domain
   - Follow DNS instructions

### Step 5: Test Payment Flow

1. **Enable Stripe Test Mode**
   - In Stripe, toggle "Test mode" ON
   - Use test payment link
   
2. **Test purchase:**
   - Click "Get Premium" on your site
   - Use test card: `4242 4242 4242 4242`
   - Any future date, any CVC
   
3. **Verify:**
   - Check Stripe dashboard for test payment
   - Test license key unlock

4. **Go Live:**
   - Toggle Stripe to "Live mode"
   - Replace with live payment link
   - Update license key system

---

## 💼 Recommended Pricing Structure

### For Launch:

**Single Option (Simple):**
- Premium: $29 one-time
- Include everything
- No subscription confusion

### After First 50 Sales:

**Three Tiers:**
- Free: 10 prompts (lead magnet)
- Premium: $29 one-time OR $9/month
- Pro: $99/month (custom prompts + consulting)

---

## 📧 Post-Purchase Email Template

Set this up in Stripe (Settings → Emails → Receipts):

```
Subject: Welcome to EventPrompt Pro! 🎉

Hi [Customer Name],

Thank you for purchasing EventPrompt Pro!

YOUR ACCESS CODE: PREMIUM2024

How to unlock:
1. Visit https://eventpromptpro.com
2. Scroll to bottom of page
3. Click "Already purchased? Unlock here"
4. Enter your access code

You now have lifetime access to:
✓ All 55+ premium prompts
✓ Variable customization
✓ Future updates (free)
✓ Priority email support

Need help? Reply to this email!

Happy planning,
[Your Name]
```

---

## 🎯 Launch Checklist

- [ ] Create Stripe account
- [ ] Generate payment link ($29)
- [ ] Update `app.js` with Stripe link
- [ ] Add license key unlock button
- [ ] Test with Stripe test mode
- [ ] Deploy to Netlify
- [ ] Test live site
- [ ] Set up post-purchase email
- [ ] Switch Stripe to live mode
- [ ] Launch! 🚀

---

## 💡 Marketing Quick Wins

Once deployed:

1. **Free Sample** - Give away 3 best prompts on Instagram
2. **Facebook Groups** - Share in wedding planner communities
3. **SEO** - Blog post: "50+ ChatGPT Prompts for Event Planners"
4. **Email Signature** - Link to product
5. **LinkedIn Post** - Share your launch story

---

## 🆘 Need Help?

**Common Issues:**

**"Payment link doesn't work"**
- Make sure Stripe account is activated
- Check if you're in test vs. live mode
- Verify link is public (not draft)

**"Can't deploy to Netlify"**
- Make sure all files are in the same folder
- Check netlify.toml is in root
- Try drag-and-drop method first

**"License key won't unlock"**
- Clear browser cache
- Try incognito mode
- Check localStorage in browser dev tools

---

**Estimated time to deploy: 30 minutes**  
**Estimated time to first sale: 1-2 weeks with basic marketing**
