/* ========================================
   EventPrompt Pro - Application Logic
   ======================================== */

// ========================================
// Prompt Database
// ========================================

const promptDatabase = [
    // ===== CLIENT COMMUNICATION (15 prompts) =====
    {
        id: 1,
        title: "Initial Consultation Follow-Up",
        category: "client",
        description: "Professional follow-up after first meeting with prospective client",
        premium: false,
        variables: ["client_name", "event_type", "event_date"],
        prompt: `Hi {{client_name}},

It was such a pleasure meeting with you and discussing your upcoming {{event_type}}! I'm absolutely thrilled about the vision you shared, and I can already envision how magical {{event_date}} will be.

As promised, here's a recap of what we discussed:
- Your preferred style and aesthetic
- Budget considerations and priorities
- Timeline and key milestones

I'd love to schedule a follow-up call this week to dive deeper into the details and answer any questions you might have. Would [Day] at [Time] work for you?

Looking forward to creating something extraordinary together!

Warmly,
[Your Name]`
    },
    {
        id: 2,
        title: "Timeline Update Reminder",
        category: "client",
        description: "Keep clients on track with important deadlines",
        premium: false,
        variables: ["client_name", "task", "deadline"],
        prompt: `Hi {{client_name}},

Just a friendly reminder that we have {{task}} coming up on {{deadline}}. This is an important milestone to keep your planning on track!

Here's what you need to do:
[List specific action items]

If you need any assistance or have questions, I'm here to help. Let's make sure we stay ahead of schedule so you can enjoy a stress-free planning experience.

Best,
[Your Name]`
    },
    {
        id: 3,
        title: "Budget Discussion Email",
        category: "client",
        description: "Navigate sensitive budget conversations professionally",
        premium: true,
        variables: ["client_name", "service_category"],
        prompt: `Hi {{client_name}},

Thank you for sharing your vision for {{service_category}}. I want to ensure we're aligned on budget expectations to create the best possible outcome for your event.

Based on current market rates and your specific requirements, here's what I recommend:
- [Option 1]: Premium tier - $X,XXX
- [Option 2]: Mid-range - $X,XXX  
- [Option 3]: Budget-friendly - $X,XXX

Each option delivers quality results, with variations in [specific details]. I'm happy to walk through these options together and find what works best for your overall budget.

Would you like to schedule a quick call this week?

Best regards,
[Your Name]`
    },
    {
        id: 4,
        title: "One Month Countdown",
        category: "client",
        description: "Exciting countdown message to build anticipation",
        premium: false,
        variables: ["client_name", "event_type"],
        prompt: `🎉 ONE MONTH TO GO, {{client_name}}! 🎉

Can you believe it? Your {{event_type}} is just 30 days away! Everything is coming together beautifully, and I couldn't be more excited for you.

Here's what's happening over the next month:
✓ Final vendor confirmations
✓ Timeline finalization
✓ Last-minute details and touches

This is the fun part where we watch all your planning come to life. Take a moment to breathe and enjoy this exciting countdown!

Got questions or feeling nervous? That's completely normal! I'm here for you every step of the way.

Cheers to the final stretch!
[Your Name]`
    },
    {
        id: 5,
        title: "Post-Event Thank You",
        category: "client",
        description: "Heartfelt gratitude message after the event",
        premium: false,
        variables: ["client_name", "event_type"],
        prompt: `Dear {{client_name}},

I'm still on cloud nine from your {{event_type}}! It was absolutely stunning, and every moment was a testament to your vision and trust in me.

Seeing everything come together – from [specific memorable moment] to [another highlight] – made all the planning worthwhile. Thank you for allowing me to be part of such a special day in your life.

If you have a moment, I'd be incredibly grateful if you could share a few words about your experience. Your feedback means the world to me and helps other couples find the perfect planner for their celebration.

[Review link]

Wishing you all the happiness in the world!

With love and gratitude,
[Your Name]`
    },
    {
        id: 6,
        title: "Design Concept Presentation",
        category: "client",
        description: "Present creative concepts to clients professionally",
        premium: true,
        variables: ["client_name", "theme"],
        prompt: `Hi {{client_name}},

I'm beyond excited to share the design concept I've created for your event! Based on our conversations, I've developed a vision centered around {{theme}}.

Here's what I'm envisioning:

COLOR PALETTE:
[Description of colors and mood]

KEY ELEMENTS:
• [Element 1]
• [Element 2]
• [Element 3]

ATMOSPHERE:
[Description of overall feeling and experience]

I've attached a mood board and initial sketches to help visualize this. I'd love to hear your thoughts and make any adjustments to ensure this feels authentically YOU.

When can we connect to discuss?

Excitedly yours,
[Your Name]`
    },
    {
        id: 7,
        title: "Crisis Management - Weather Concern",
        category: "client",
        description: "Address weather concerns calmly and professionally",
        premium: true,
        variables: ["client_name", "event_date"],
        prompt: `Hi {{client_name}},

I know weather forecasts for {{event_date}} have you concerned, and I want to reassure you that we're fully prepared for any scenario.

Here's our backup plan:
✓ [Backup venue/tent option secured]
✓ [Alternative timeline prepared]
✓ [Vendor notifications ready]

We've been monitoring forecasts closely and will make the final call [X hours] before the event. Remember, we've planned for contingencies from day one.

Some of the most magical events happen when plans adapt beautifully. Rain or shine, your day will be absolutely perfect.

Stay calm and trust the process – I've got you!

[Your Name]`
    },
    {
        id: 8,
        title: "Guest Count Finalization",
        category: "client",
        description: "Request final headcount for venue and catering",
        premium: true,
        variables: ["client_name", "deadline", "current_count"],
        prompt: `Hi {{client_name}},

Hope you're doing well! We need to finalize the guest count by {{deadline}} to confirm with the venue and caterer.

Current RSVP Status:
• Confirmed: {{current_count}}
• Awaiting response: [#]
• Declined: [#]

Please reach out to any guests who haven't responded and let me know the final number by {{deadline}}. This ensures we have:
✓ Accurate seating arrangements
✓ Proper catering quantities
✓ Correct rental counts

Any questions on who to include? Let's chat!

Best,
[Your Name]`
    },
    {
        id: 9,
        title: "Payment Reminder - Professional",
        category: "client",
        description: "Gentle reminder for outstanding payment",
        premium: true,
        variables: ["client_name", "amount", "due_date"],
        prompt: `Hi {{client_name}},

I hope planning is going smoothly! This is a friendly reminder that the payment of ${{ amount }} is due on {{due_date}}.

You can submit payment via:
• [Payment method 1]
• [Payment method 2]
• [Payment method 3]

If you've already sent this, please disregard! If you have any questions about the invoice or need to discuss payment options, I'm happy to help.

Thank you for your continued trust!

Best regards,
[Your Name]`
    },
    {
        id: 10,
        title: "Introducing Planning Portal",
        category: "client",
        description: "Guide clients through your planning platform",
        premium: true,
        variables: ["client_name", "portal_link"],
        prompt: `Hi {{client_name}},

Great news! Your personalized planning portal is now live. This is your one-stop hub for everything related to your event.

Access your portal here: {{portal_link}}

What you'll find inside:
📅 Timeline with all important dates
📎 Vendor contacts and contracts
💰 Budget tracker
✅ Task checklist
📸 Inspiration board

I'll be updating this regularly, and you can access it 24/7. No more searching through emails!

Let me know if you have any trouble logging in.

Happy planning!
[Your Name]`
    },
    {
        id: 11,
        title: "Handling Difficult Family Dynamics",
        category: "client",
        description: "Navigate family tension with diplomacy",
        premium: true,
        variables: ["client_name"],
        prompt: `Hi {{client_name}},

I understand family dynamics can sometimes add stress to the planning process, and I want you to know I'm here to support you.

Here's how we can handle this:
1. I can be the "messenger" for difficult conversations
2. We can schedule a family planning meeting with me as mediator
3. I can help establish boundaries around decision-making

Remember: This is YOUR day. While family input is valuable, ultimately the decisions rest with you. My job is to ensure you feel supported and empowered throughout this process.

Want to discuss strategies? I'm here.

Your advocate,
[Your Name]`
    },
    {
        id: 12,
        title: "Vendor Introduction Email",
        category: "client",
        description: "Introduce clients to recommended vendors",
        premium: true,
        variables: ["client_name", "vendor_type", "vendor_name"],
        prompt: `Hi {{client_name}},

I'm excited to introduce you to {{vendor_name}}, an exceptional {{vendor_type}} I've worked with many times.

Why I recommend them:
• [Reason 1]
• [Reason 2]
• [Reason 3]

They understand my couples' vision and consistently deliver outstanding results. I've cc'd them on this email so you can connect directly.

{{vendor_name}}, meet {{client_name}}! They're planning [event details] and I immediately thought of you for {{vendor_type}}.

I'll let you two take it from here!

Best,
[Your Name]`
    },
    {
        id: 13,
        title: "Emergency Contact Day-Of",
        category: "client",
        description: "Provide day-of emergency contact information",
        premium: true,
        variables: ["client_name", "event_date", "phone_number"],
        prompt: `Hi {{client_name}},

As we approach {{event_date}}, I want to make sure you have all my contact information for the big day!

📱 My Direct Line: {{phone_number}}
📱 Backup Contact: [Assistant/Team member]

I'll have my phone on me at all times from [start time] until [end time]. Call or text me with ANYTHING – no question is too small!

YOUR ONLY JOB: Show up and enjoy every moment. I'll handle the rest.

See you soon!
[Your Name]`
    },
    {
        id: 14,
        title: "Rehearsal Schedule & Instructions",
        category: "client",
        description: "Provide rehearsal details to wedding party",
        premium: true,
        variables: ["client_name", "rehearsal_date", "rehearsal_time", "location"],
        prompt: `Hi {{client_name}} and wedding party!

Rehearsal details for {{rehearsal_date}}:

📍 LOCATION: {{location}}
⏰ TIME: {{rehearsal_time}}
👔 ATTIRE: Casual comfortable
⏱️ DURATION: Approximately 45-60 minutes

What we'll cover:
✓ Processional order and timing
✓ Positioning at the altar
✓ Recessional
✓ Key moments and transitions

Please arrive 10 minutes early. This is a relaxed run-through to make everyone comfortable for tomorrow!

Questions? Text me anytime.

See you there!
[Your Name]`
    },
    {
        id: 15,
        title: "Anniversary Follow-Up",
        category: "client",
        description: "Thoughtful anniversary message to past clients",
        premium: true,
        variables: ["client_name", "years"],
        prompt: `Hi {{client_name}}!

Happy {{years}}-year anniversary! 🎉

I can't believe it's been {{years}} years since your beautiful celebration. I still think about [specific memorable moment] and smile.

I hope married life has been everything you dreamed of and more. Thank you for trusting me with such an important day – it remains one of my favorite events.

Cheers to many more wonderful years together!

With love,
[Your Name]

P.S. If you know anyone planning their big day, I'd be honored if you'd share my name! 💕`
    },

    // ===== VENDOR MANAGEMENT (15 prompts) =====
    {
        id: 16,
        title: "Vendor Inquiry Template",
        category: "vendor",
        description: "Professional initial outreach to potential vendors",
        premium: false,
        variables: ["vendor_name", "service_type", "event_date", "guest_count"],
        prompt: `Hello {{vendor_name}},

I'm reaching out on behalf of a client who is planning a [event type] for {{event_date}} with approximately {{guest_count}} guests.

Event Details:
• Date: {{event_date}}
• Location: [Venue name/city]
• Guest count: {{guest_count}}
• Style: [Design aesthetic]

We're currently seeking {{service_type}} services. Could you please provide:
1. Your availability for this date
2. Package options and pricing
3. Portfolio or recent work samples

If you're available, I'd love to schedule a call to discuss the vision in more detail.

Thank you for your time!

Best regards,
[Your Name]
[Your Company]
[Contact Information]`
    },
    {
        id: 17,
        title: "Contract Negotiation",
        category: "vendor",
        description: "Navigate pricing and contract terms professionally",
        premium: true,
        variables: ["vendor_name", "proposed_amount"],
        prompt: `Hi {{vendor_name}},

Thank you for the proposal! Your work is stunning, and my clients are very interested in moving forward.

I'd like to discuss the pricing structure. The proposed amount of ${{ proposed_amount }} is slightly above our allocated budget for this service category.

Would you be open to:
• Adjusting the package to $[target amount]
• Offering a payment plan
• Including [additional service] at the current rate

We value quality and are committed to working with the best vendors. I'm confident we can find a solution that works for everyone.

Can we schedule a call this week?

Best,
[Your Name]`
    },
    {
        id: 18,
        title: "Payment Confirmation to Vendor",
        category: "vendor",
        description: "Confirm payment sent to vendor",
        premium: false,
        variables: ["vendor_name", "amount", "payment_date"],
        prompt: `Hi {{vendor_name}},

I wanted to confirm that payment of ${{ amount }} was sent via [payment method] on {{payment_date}}.

You should receive it within [timeframe]. Please let me know once it's received so I can update our records.

Looking forward to working together on this event!

Best,
[Your Name]`
    },
    {
        id: 19,
        title: "Day-of Coordinator Contact Sheet",
        category: "vendor",
        description: "Share timeline and contact information with all vendors",
        premium: true,
        variables: ["event_date", "venue_name"],
        prompt: `Hello wonderful vendor team!

We're T-minus [days] until the big day! Here's your day-of coordination sheet for {{event_date}} at {{venue_name}}.

TIMELINE:
[Detailed timeline with load-in, setup, event, breakdown times]

All VENDOR CONTACTS:
[List all vendors with phone numbers and email]

Day-of Coordinator: [Your name & phone]
Emergency Contact: [Backup person]

PARKING & LOAD-IN:
[Specific instructions]

Please confirm receipt and let me know if you have any questions. See you soon!

[Your Name]`
    },
    {
        id: 20,
        title: "Vendor Issue Resolution",
        category: "vendor",
        description: "Address vendor performance issues diplomatically",
        premium: true,
        variables: ["vendor_name", "issue"],
        prompt: `Hi {{vendor_name}},

I wanted to reach out regarding {{issue}} that came up recently. I truly value our working relationship and want to address this constructively.

Here's my concern:
[Specific description of issue]

How it impacts the event:
[Explanation of impact]

I'm confident we can resolve this together. Could we schedule a call to discuss solutions? I'm happy to be flexible and find a path forward that works for everyone.

Thank you for your understanding.

Best,
[Your Name]`
    },
    {
        id: 21,
        title: "Vendor Referral Request",
        category: "vendor",
        description: "Request vendor recommendations from trusted partners",
        premium: true,
        variables: ["vendor_name", "needed_service"],
        prompt: `Hi {{vendor_name}},

Hope you're having a great week! I'm working on an event and need a stellar {{needed_service}} recommendation.

The event details:
• Date: [Date]
• Location: [Venue]
• Style: [Aesthetic]
• Budget range: [Range]

Do you have anyone you love working with? I trust your judgment and would appreciate any connections you can share.

Thanks so much!
[Your Name]`
    },
    {
        id: 22,
        title: "Vendor Appreciation Note",
        category: "vendor",
        description: "Thank vendors after successful collaboration",
        premium: false,
        variables: ["vendor_name", "event_date"],
        prompt: `Dear {{vendor_name}},

I'm still glowing from the event on {{event_date}}! Your work was absolutely exceptional, and you helped create magic for our clients.

[Specific compliment about their work]

Working with professionals like you makes my job so much easier. Thank you for your creativity, flexibility, and dedication to excellence.

I've already added you to my preferred vendor list and will be recommending you enthusiastically to future clients!

With gratitude,
[Your Name]

P.S. If you'd like photos from the event for your portfolio, let me know!`
    },
    {
        id: 23,
        title: "Last-Minute Vendor Change",
        category: "vendor",
        description: "Handle emergency vendor replacement professionally",
        premium: true,
        variables: ["new_vendor_name", "service_type", "event_date"],
        prompt: `Hi {{new_vendor_name}},

I have an urgent request. We need a {{service_type}} for an event on {{event_date}} due to an unexpected vendor cancellation.

Event Details:
• Date: {{event_date}}
• Time: [Time]
• Location: [Venue]
• Guest count: [Number]
• Requirements: [Specific needs]

I know this is extremely short notice, but if you're available, I would be incredibly grateful. We're prepared to:
• Pay rush fee if needed
• Provide detailed brief immediately
• Be flexible on specific requirements

Can you help us? Please let me know ASAP.

Thank you!
[Your Name]
[Phone number]`
    },
    {
        id: 24,
        title: "Vendor Timeline Confirmation",
        category: "vendor",
        description: "Confirm vendor understands timeline requirements",
        premium: true,
        variables: ["vendor_name", "setup_time", "event_start"],
        prompt: `Hi {{vendor_name}},

As we finalize the timeline, I want to confirm your setup requirements:

Your designated setup time: {{setup_time}}
Event start: {{event_start}}
Your completion deadline: [Time]

Load-in access: [Details]
Parking: [Instructions]
Contact on-site: [Coordinator name & phone]

Does this work for you? Any adjustments needed?

Please confirm by [date] so we can finalize the master timeline.

Thanks!
[Your Name]`
    },
    {
        id: 25,
        title: "Vendor Portfolio Request",
        category: "vendor",
        description: "Request work samples for client review",
        premium: true,
        variables: ["vendor_name", "service_type"],
        prompt: `Hi {{vendor_name}},

My clients are very interested in your {{service_type}} services! To help them visualize your style, could you share:

• 3-5 examples of similar events
• Any work in [specific style/color]
• Testimonials from recent clients
• Pricing packages

If you have a recent portfolio PDF or online gallery, that would be perfect!

They're making final decisions by [date], so any information you can provide this week would be wonderful.

Thank you!
[Your Name]`
    },
    {
        id: 26,
        title: "Vendor Cancellation Notice",
        category: "vendor",
        description: "Professionally cancel vendor services",
        premium: true,
        variables: ["vendor_name", "service_type"],
        prompt: `Dear {{vendor_name}},

I need to inform you that we've decided to move in a different direction for {{service_type}} services for this event.

This was a difficult decision, and it's not a reflection on your work or professionalism. [Brief, honest reason if appropriate].

Per our contract:
• Cancellation fee: $[amount]
• Payment due: [date]
• Deposit status: [refundable/non-refundable]

I'll process any applicable payments immediately. Thank you for your understanding, and I hope we can collaborate on future events.

Best regards,
[Your Name]`
    },
    {
        id: 27,
        title: "Vendor Liability Insurance Request",
        category: "vendor",
        description: "Request required insurance documentation",
        premium: true,
        variables: ["vendor_name", "venue_name"],
        prompt: `Hi {{vendor_name}},

Great news – we're all set to move forward! The venue ({{venue_name}}) requires proof of liability insurance from all vendors.

Please provide:
✓ Certificate of Insurance
✓ Minimum $1M general liability coverage
✓ {{venue_name}} listed as additional insured
✓ Coverage valid on [event date]

You can send this directly to me or to the venue at [contact].

Deadline: [Date]

Let me know if you need the venue's exact information for the certificate!

Thanks,
[Your Name]`
    },
    {
        id: 28,
        title: "Vendor Weather Contingency",
        category: "vendor",
        description: "Coordinate backup plans with outdoor vendors",
        premium: true,
        variables: ["vendor_name", "event_date"],
        prompt: `Hi {{vendor_name}},

With {{event_date}} approaching, I want to confirm our weather contingency plan for outdoor setup.

Current Plan A (Weather Permitting):
[Outdoor setup details]

Backup Plan B (Rain/Wind):
[Indoor or covered alternative]

Decision timeline:
• Weather check: [X hours before]
• Final call: [X hours before]
• Toggle point: [conditions that trigger change]

Can you execute Plan B with the same timeline if needed? Any additional costs associated with the backup plan?

Please confirm you're comfortable with both scenarios.

Thanks!
[Your Name]`
    },
    {
        id: 29,
        title: "Vendor Pre-Event Check-In",
        category: "vendor",
        description: "Final confirmation 48 hours before event",
        premium: true,
        variables: ["vendor_name", "event_date"],
        prompt: `Hi {{vendor_name}},

We're 48 hours out from {{event_date}}! Final check-in:

✓ You're confirmed for [arrival time]
✓ All equipment/materials ready
✓ You have the timeline and contact sheet
✓ Load-in instructions clear
✓ Payment current

Is there ANYTHING you need from me before the big day?

• Questions about the timeline?
• Missing information?
• Last-minute concerns?

My phone will be on 24/7 starting [date/time]. Let's make this amazing!

[Your Name]
[Phone]`
    },
    {
        id: 30,
        title: "Requesting Vendor Discount",
        category: "vendor",
        description: "Ask for preferred planner pricing",
        premium: true,
        variables: ["vendor_name"],
        prompt: `Hi {{vendor_name}},

I've been so impressed with your work, and I'd love to establish an ongoing partnership. I book [X] events per year and am always looking for exceptional vendors to recommend.

Would you offer preferred pricing for events I coordinate? Many of my vendor partners provide:
• 10-15% planner discount
• Priority booking for my clients
• Expedited communication

In return, I offer:
• Consistent referrals
• Detailed, organized communication
• Promotion on my platforms
• Positive reviews and testimonials

I think we could create a really valuable partnership. Interested in discussing?

Best,
[Your Name]`
    },

    // ===== TIMELINE & PLANNING (10 prompts) =====
    {
        id: 31,
        title: "Create 12-Month Wedding Timeline",
        category: "timeline",
        description: "Generate comprehensive year-long planning checklist",
        premium: false,
        variables: ["wedding_date", "couple_names"],
        prompt: `Create a detailed 12-month wedding planning timeline for {{couple_names}} with a wedding date of {{wedding_date}}.

Include:
- Month-by-month task breakdown
- Vendor booking deadlines
- Budget milestones
- Guest list management phases
- Attire shopping timeline
- Invitation ordering and mailing dates
- Final details month
- Week-of checklist

Format as a checklist with specific deadlines and prioritization. Make it feel exciting, not overwhelming!`
    },
    {
        id: 32,
        title: "Day-Of Timeline Generator",
        category: "timeline",
        description: "Create minute-by-minute event day schedule",
        premium: true,
        variables: ["event_type", "ceremony_time", "reception_time"],
        prompt: `Generate a detailed day-of timeline for a {{event_type}} with:
• Ceremony: {{ceremony_time}}
• Reception: {{reception_time}}

Include:
- Hair & makeup schedule
- Photo session times (getting ready, first look, family, bridal party)
- Vendor arrival times
- Setup completion deadlines
- Ceremony processional order
- Cocktail hour
- Reception entrance
- Dinner service
- Toasts and speeches
- Special dances
- Cake cutting
- Open dancing
- Send-off
- Vendor breakdown

Format as 15-minute increments with responsible party noted for each task.`
    },
    {
        id: 33,
        title: "RSVP Tracking System",
        category: "timeline",
        description: "Organize guest responses and follow-ups",
        premium: true,
        variables: ["total_invited", "rsvp_deadline"],
        prompt: `Create an RSVP tracking system for {{total_invited}} guests with deadline of {{rsvp_deadline}}.

Generate:
1. Master guest list template with columns for:
   - Guest name
   - Mailing address
   - Email/phone
   - Invite sent date
   - RSVP yes/no
   - Number of guests
   - Meal preferences
   - Dietary restrictions
   - Plus-one status
   - Table assignment

2. Follow-up email templates for:
   - 2 weeks before deadline (gentle reminder)
   - 3 days before deadline (urgent)
   - After deadline (final request)

3. Weekly tracking summary format`
    },
    {
        id: 34,
        title: "Seating Chart Optimizer",
        category: "timeline",
        description: "Strategic seating arrangement planning",
        premium: true,
        variables: ["guest_count", "table_size"],
        prompt: `Help me create an optimized seating chart for {{guest_count}} guests with tables of {{table_size}}.

Provide strategy for:
1. Grouping considerations:
   - Family dynamics
   - Friend groups
   - Professional colleagues
   - Singles vs. couples
   - Age ranges for conversation compatibility

2. Placement priorities:
   - VIP table locations
   - Elderly guests (accessibility)
   - Families with children
   - Dance floor proximity
   - Away from speakers/kitchen

3. Template format:
   - Table numbers
   - Guest names per table
   - Relationship to couple
   - Special seating notes

Include tips for handling sensitive requests and last-minute changes.`
    },
    {
        id: 35,
        title: "Budget Breakdown Template",
        category: "timeline",
        description: "Detailed budget allocation by category",
        premium: false,
        variables: ["total_budget"],
        prompt: `Create a comprehensive wedding budget breakdown for a total budget of ${{ total_budget }}.

Allocate percentages across:
• Venue (ceremony + reception): 
• Catering & bar:
• Photography & videography:
• Music/Entertainment:
• Flowers & décor:
• Attire (bride, groom, wedding party):
• Invitations & paper goods:
• Transportation:
• Hair & makeup:
• Wedding planner:
• Favors & gifts:
• Miscellaneous/contingency:

For each category:
1. Recommended budget amount
2. What's typically included
3. Cost-saving tips
4. Where to splurge vs. save

Format as easy-to-use spreadsheet template.`
    },
    {
        id: 36,
        title: "Vendor Payment Schedule",
        category: "timeline",
        description: "Track deposits and payment deadlines",
        premium: true,
        variables: ["wedding_date"],
        prompt: `Create a vendor payment tracking schedule for a wedding on {{wedding_date}}.

Generate a spreadsheet template with:

COLUMNS:
- Vendor name/service
- Contract date
- Total contract amount
- Deposit amount
- Deposit due date
- Deposit paid (checkbox)
- Second payment amount
- Second payment due date
- Second payment paid (checkbox)
- Final payment amount
- Final payment due date
- Final payment paid (checkbox)
- Payment method
- Confirmation number
- Notes

Include:
• Automatic total calculations
• Payment reminders (30, 14, 7 days before)
• Running total of paid vs. owed
• Visual indicators for overdue payments

Add typical payment schedule recommendations for each vendor type.`
    },
    {
        id: 37,
        title: "Emergency Kit Checklist",
        category: "timeline",
        description: "Comprehensive day-of emergency supplies",
        premium: true,
        variables: ["event_type"],
        prompt: `Create the ultimate emergency kit checklist for a {{event_type}}.

CATEGORIES:

Fashion Emergencies:
• [List items: safety pins, sewing kit, stain remover, etc.]

Beauty Touch-Ups:
• [List items: makeup, hair products, etc.]

Health & Comfort:
• [List items: pain relievers, antacids, bandaids, etc.]

Weather Preparedness:
• [List items: umbrellas, shawls, sunscreen, etc.]

Tech Essentials:
• [List items: phone chargers, batteries, etc.]

Ceremony Supplies:
• [List items: tissues, rings backup, vows printed, etc.]

Reception Must-Haves:
• [List items: speaker for toasts, lighters for candles, etc.]

Format as printable checklist with checkbox next to each item. Include quantities needed.`
    },
    {
        id: 38,
        title: "Rehearsal Dinner Planning",
        category: "timeline",
        description: "Organize pre-wedding rehearsal event",
        premium: true,
        variables: ["rehearsal_date", "guest_count"],
        prompt: `Create a complete rehearsal dinner plan for {{rehearsal_date}} with {{guest_count}} guests.

TIMELINE:
• Ceremony rehearsal: [Duration and order]
• Transition to dinner location
• Cocktail hour
• Dinner service
• Toasts and speeches order
• End time

GUEST LIST:
• Who to invite (wedding party, family, out-of-town guests?)
• Plus-ones policy
• Children included?

PLANNING CHECKLIST:
□ Venue selection and reservation
□ Menu planning
□ Invitation wording and send date
□ Seating arrangements
□ Welcome remarks preparation
□ Toast order (who speaks when)
□ Any gifts for wedding party
□ Rehearsal run-through agenda

Include etiquette guidelines and hosting responsibilities.`
    },
    {
        id: 39,
        title: "Destination Wedding Logistics",
        category: "timeline",
        description: "Coordinate travel and accommodation for guests",
        premium: true,
        variables: ["destination", "wedding_date"],
        prompt: `Create a destination wedding logistics plan for {{destination}} on {{wedding_date}}.

GUEST INFORMATION PACKET:
1. Travel details:
   • Recommended flights/airports
   • Ground transportation options
   • Estimated costs

2. Accommodation:
   • Hotel room blocks (multiple price points)
   • Booking codes and deadlines
   • Alternative lodging options

3. Weekend itinerary:
   • Welcome event
   • Wedding day schedule
   • Day-after brunch
   • Optional activities/excursions

4. Destination info:
   • Weather expectations
   • What to pack
   • Local customs/etiquette
   • Currency/language tips

5. Important dates:
   • Save the date distribution
   • Formal invitation mailing
   • RSVP deadline
   • Travel booking deadline
   • Room block expiration

Format as shareable website or PDF guide.`
    },
    {
        id: 40,
        title: "Post-Wedding Task Checklist",
        category: "timeline",
        description: "Complete all loose ends after the event",
        premium: true,
        variables: ["couple_names"],
        prompt: `Create a post-wedding checklist for {{couple_names}} to ensure nothing falls through the cracks.

IMMEDIATE (Within 1 week):
□ Return rentals (attire, décor items)
□ Preserve wedding dress
□ Submit marriage certificate
□ Write vendor thank-you notes
□ Post wedding photos on social media
□ Secure wedding cake top tier (freezing)
□ Download and backup all photos/videos

SHORT-TERM (1-4 weeks):
□ Send guest thank-you notes
□ Change name (if applicable): Social Security, DMV, passport, bank, etc.
□ Update marital status with employer/insurance
□ Order additional prints/albums
□ Leave vendor reviews online
□ Final budget reconciliation
□ Preserve flowers (if desired)

LONG-TERM (1-3 months):
□ Frame favorite photos
□ Create wedding album or scrapbook
□ File all contracts and receipts
□ Update emergency contacts everywhere
□ Plan Thank you note template

Include address change checklist and name change documentation guide.`
    },

    // ===== SOCIAL MEDIA (10 prompts) =====
    {
        id: 41,
        title: "Instagram Engagement Post",
        category: "social",
        description: "Boost visibility with an engaging question or poll",
        premium: false,
        variables: ["topic"],
        prompt: `Create an engaging Instagram post about {{topic}} that encourages comments and saves.

Format:
- Attention-grabbing opening line
- 3-5 valuable tips or insights
- Call-to-action question
- Relevant hashtags (10-15 mix of popular and niche)

Make it conversational, helpful, and on-brand for event planning. Include emojis strategically.`
    },
    {
        id: 42,
        title: "Client Testimonial Request",
        category: "social",
        description: "Request reviews and testimonials from happy clients",
        premium: false,
        variables: ["client_name", "event_type"],
        prompt: `Hi {{client_name}},

I'm so glad you loved your {{event_type}}! Your kind words mean everything to me.

Would you be willing to share your experience? A quick review would help other couples find the perfect planner for their celebration.

You can leave a review here:
• Google: [link]
• Facebook: [link]
• WeddingWire/The Knot: [link]

Or simply reply with a few sentences about your experience, and I can format it as a testimonial for my website.

If you have any favorite photos you'd be willing to let me share (with credit to your photographer!), that would be amazing too.

Thank you so much for your support!

Gratefully,
[Your Name]`
    },
    {
        id: 43,
        title: "Behind-the-Scenes Story",
        category: "social",
        description: "Share authentic planning process content",
        premium: true,
        variables: ["specific_task"],
        prompt: `Create an Instagram Story series showing behind-the-scenes of {{specific_task}}.

Frame it as:
1. Opening slide: "Ever wondered how [task] actually happens?"
2. Problem slide: "Most people don't realize..."
3. Process slides (3-4): Step-by-step breakdown with photos/videos
4. Result slide: The final outcome
5. Engagement slide: "What should I show you next? Vote below!"

Include:
- Candid photos/videos
- Honest commentary
- Quick tips
- Relatable humor
- Swipe-up CTA (if applicable)

Make followers feel like insiders!`
    },
    {
        id: 44,
        title: "Vendor Shoutout Post",
        category: "social",
        description: "Tag and celebrate vendor partners",
        premium: true,
        variables: ["vendor_name", "vendor_type"],
        prompt: `Create an Instagram post celebrating {{vendor_name}} ({{vendor_type}}).

Caption structure:
- Opening: Why you love working with them
- Specific example: Recent event or standout moment
- Their superpower: What makes them exceptional
- Tag and recommend: Encourage followers to check them out
- Hashtags: Industry + local tags

Example opening:
"Can we talk about how incredible @{{vendor_name}} is? 🙌"

Make it genuine, specific, and mutually beneficial. This builds relationships and provides value to followers.

Include 2-3 questions to ask them for a collaborative reel/story series.`
    },
    {
        id: 45,
        title: "Event Announcement Teaser",
        category: "social",
        description: "Build anticipation for upcoming event",
        premium: true,
        variables: ["event_type", "unique_element"],
        prompt: `Create a teaser post for an upcoming {{event_type}} featuring {{unique_element}}.

Build mystery and excitement:

Caption ideas:
- "This [date] is going to be MAGICAL ✨"
- "Sneak peek at what we're creating..."
- "Can you guess the theme from this detail?"

Content options:
- Close-up of a beautiful detail
- Color palette
- Mood board snippet
- Cryptic hint
- Countdown graphic

Include:
- Date/location (if shareable)
- What makes this event special
- Tag venue/vendors (with permission)
- Engagement question
- Save the date for photo reveals

Build anticipation without revealing too much!`
    },
    {
        id: 46,
        title: "Educational Carousel Post",
        category: "social",
        description: "Share valuable planning tips in swipeable format",
        premium: true,
        variables: ["topic", "number_of_tips"],
        prompt: `Create a {{number_of_tips}}-slide Instagram carousel about {{topic}}.

Slide 1 (Cover):
- Bold, eye-catching title
- Subheading with benefit
- Your logo/branding

Slides 2-[number]:
- One tip per slide
- Clear headline
- 2-3 sentences explanation
- Relevant icon or image

Final Slide:
- Call-to-action
- "Save this for later!"
- "Tag someone planning a wedding"
- Follow prompt

Caption:
- Hook: Relatable problem/question
- Brief intro to topic
- "Swipe for [#] tips →"
- Detailed explanation
- Engagement question
- Hashtags

Make it valuable, saveable content that positions you as an expert.`
    },
    {
        id: 47,
        title: "Real Wedding Feature Post",
        category: "social",
        description: "Showcase completed event with storytelling",
        premium: true,
        variables: ["couple_names", "wedding_style", "standout_feature"],
        prompt: `Create an Instagram post featuring {{couple_names}}'s {{wedding_style}} wedding, highlighting {{standout_feature}}.

Caption structure:

Opening: Emotional hook
"I'm still dreaming about this day 😍"

The Story:
- How you met the couple
- Their vision
- Challenges overcome
- Special moments

The Details:
- Style description
- Standout feature highlight
- Personal touches

Vendor Love:
Tag all vendors with specific compliments

Engagement:
Ask: "What's your favorite detail?" or "Can you spot the [unique element]?"

Photo carousel order:
1. Hero shot (ceremony or couple)
2. Décor detail
3. Standout feature
4. Candid moment
5. Venue/atmosphere
6-10. Mix of details, guests, and celebration

Hashtags: Mix of trending wedding tags + local + your branded hashtag`
    },
    {
        id: 48,
        title: "Trending Audio Reel Script",
        category: "social",
        description: "Create viral-potential short video content",
        premium: true,
        variables: ["trending_audio", "planning_topic"],
        prompt: `Create an Instagram Reel script using [{{trending_audio}}] about {{planning_topic}}.

Hook (First 3 seconds):
"POV: [Relatable scenario]" or "When your client says..."

Content format options:

Option 1 - Before/After:
- Show the problem
- Show your solution
- End with satisfied result

Option 2 - Day in the Life:
- Quick cuts of your workday
- Synchronized to good beat drops
- Behind-the-scenes moments

Option 3 - Educational:
- "3 things every bride should know about [topic]"
- Quick text overlays
- Each point on a beat

Caption:
- Brief context
- Encourage shares: "Send this to a bride-to-be!"
- Question for comments
- Relevant hashtags (5-7 max for Reels)

Text overlay script:
[Frame-by-frame text to appear on screen]

Make it relatable, valuable, and aligned with the trending audio's vibe!`
    },
    {
        id: 49,
        title: "Client Preparation Guide Post",
        category: "social",
        description: "Educate potential clients on working with a planner",
        premium: true,
        variables: ["topic"],
        prompt: `Create an educational post about {{topic}} to help potential clients prepare.

Format as "What to know before..." or "How to prepare for..."

Structure:
✨ Why this matters
📋 What to have ready
❌ Common mistakes to avoid  
✅ Pro tips
💡 How a planner helps

Make it:
- Actionable and specific
- Builds trust in your expertise
- Positions planning services as essential
- Answers objections preemptively

End with soft CTA:
"Need help with this? Let's chat!" or "This is exactly what I do for my clients."

Include mix of informative and aspirational content. Show both the problem and the dream outcome.`
    },
    {
        id: 50,
        title: "Engagement Pod Discussion Starter",
        category: "social",
        description: "Create content for planner communities and pod engagement",
        premium: true,
        variables: ["discussion_topic"],
        prompt: `Create a discussion post for event planner engagement pods about {{discussion_topic}}.

Format:

Opening:
"Fellow planners! Let's talk about [topic] 👇"

The Question/Scenario:
Present a relatable challenge or decision point

Framework for Discussion:
- Your experience/approach
- What's worked
- What hasn't
- Variables to consider

Engagement Prompts:
- "How do you handle this?"
- "Am I the only one?"
- "Weigh in below!"

Why This Works:
- Builds community
- Generates genuine engagement
- Provides networking value
- Establishes thought leadership

Include hashtags for planner communities: #weddingplanner #eventprofs #plannerlife etc.

Keep it authentic - this is peer-to-peer, not client-facing!`
    },

    // ===== EMERGENCY RESPONSES (5 prompts) =====
    {
        id: 51,
        title: "Vendor No-Show Emergency",
        category: "emergency",
        description: "Handle vendor cancellation on event day",
        premium: true,
        variables: ["vendor_type", "event_time"],
        prompt: `EMERGENCY: {{vendor_type}} hasn't arrived and event starts in {{event_time}}.

Immediate action plan:

1. Communication:
   - Call vendor (3 attempts)
   - Text vendor with urgency marker
   - Check contract for backup contact

2. Backup activation:
   - Pull list of alternative vendors in area
   - Call in priority order:
     * Previous reliable partners
     * Vendors from same company
     * Network referrals
   - Explain situation, offer premium rate

3. Client communication:
   - DO NOT panic the couple
   - Frame as "We're handling a situation"
   - Present solution, not problem
   - Keep updates brief and confident

4. Temporary solution:
   [Specific suggestions based on vendor type]

5. Documentation:
   - Screenshot all communication attempts
   - Note timeline of events
   - Save for contract breach/insurance claim

Template client update:
"Quick update - we have a [vendor type] situation but I'm already implementing Plan B. You won't notice any difference, promise. Stay focused on enjoying your day!"

Post-event follow-up script for vendor and potential legal action included.`
    },
    {
        id: 52,
        title: "Extreme Weather Day-Of",
        category: "emergency",
        description: "Execute weather contingency plan",
        premium: true,
        variables: ["weather_condition", "hours_until_event"],
        prompt: `WEATHER EMERGENCY: {{weather_condition}} forecasted, event in {{hours_until_event}} hours.

DECISION TREE:

If 6+ hours out:
✓ Activate full backup plan
✓ Contact all vendors with Plan B details
✓ Communicate early to guests (if ceremony time/location changes)

If 2-6 hours out:
✓ Make final call based on radar
✓ Quick vendor pivots only
✓ Focus on guest comfort (umbrellas, heat/AC)

If <2 hours out:
✓ Proceed with best available option
✓ Maximize guest comfort
✓ Frame as "memorable" not "disaster"

CLIENT COMMUNICATION:
Subject: "Weather Update & Our Perfect Plan B"

"Here's what's happening with the weather, and here's exactly how we're handling it:

[Current backup plan]

Everything beautiful about your day remains exactly the same:
✓ All vendors confirmed and ready
✓ Timeline adjusted but intact
✓ Photography opportunities secured
✓ Guest comfort prioritized

This will be a story you tell forever. Trust me - some of the most magical weddings happen when we embrace the unexpected.

You focus on getting married. I'll handle everything else."

VENDOR UPDATES:
[Template for mass vendor notification]

GUEST COMFORT KIT:
[Emergency supplies checklist for weather]

Remember: Your energy sets the tone. Stay calm, positive, confident.`
    },
    {
        id: 53,
        title: "Family Drama Intervention",
        category: "emergency",
        description: "De-escalate family conflicts during event",
        premium: true,
        variables: ["situation"],
        prompt: `FAMILY EMERGENCY: {{situation}}

IMMEDIATE RESPONSE:

1. Physical intervention:
   - Calmly approach
   - Create physical space between parties
   - Move to private area if possible

2. De-escalation script:
   "I understand emotions are high today. This is [Couple's] celebration, and they need everyone's support right now. Let's take a moment to reset."

3. Separate parties:
   - Assign each to a trusted family member/friend
   - Keep them in different areas
   - Provide tasks to redirect energy

4. Protect the couple:
   - DO NOT involve them unless absolutely necessary
   - Keep them in separate area
   - Have bridal party/groomsmen run interference

5. Timeline adjustments:
   - Delay problematic moments if needed
   - Rearrange order of events
   - Skip or modify speeches if required

POST-INCIDENT:

Check with couple:
"I handled [situation]. You didn't need to worry about it. Are you okay? What do you need from me?"

Documentation:
- Note what happened
- How you resolved it
- Any ongoing concerns

Prevention for remainder of event:
- Strategic seating adjustments
- Alcohol monitoring
- Extra vigilance during high-emotion moments (speeches, dances)

Remember: You are the couple's advocate. Their happiness is your only loyalty.`
    },
    {
        id: 54,
        title: "Medical Emergency Protocol",
        category: "emergency",
        description: "Handle guest injury or health crisis",
        premium: true,
        variables: ["emergency_type"],
        prompt: `MEDICAL EMERGENCY: {{emergency_type}}

IMMEDIATE PROTOCOL:

1. Assess situation:
   - Is person conscious/breathing?
   - If NO → Call 911 IMMEDIATELY
   - If YES → Proceed to step 2

2. Get help:
   - Call 911 if serious
   - Ask "Is there a doctor/nurse present?"
   - Venue staff for first aid kit

3. Create space:
   - Move guests away
   - Assign someone to direct EMTs if called
   - Protect person's privacy/dignity

4. Contact emergency contact:
   - Find person's phone/purse
   - Call their emergency contact
   - Notify family member at event

5. Protect the couple:
   - Keep them informed but NOT involved
   - Have bridal party/family handle
   - Continue event in different area if possible

6. Manage guests:
   Announcement if needed:
   "[Name] needed medical attention and is being cared for. Their family has been notified. Let's give them privacy and continue celebrating for [Couple]."

7. Coordinate with venue:
   - Incident report
   - Insurance information exchange
   - Facility accommodations

DOCUMENTATION:
- Timeline of events
- Witnesses
- Actions taken
- Emergency responder names/times
- For insurance/liability purposes

POST-INCIDENT:
- Follow up with injured person's family
- Inform couple of resolution
- Check if anyone else needs support
- Consult liability insurance if applicable

Always prioritize human safety over event continuation.`
    },
    {
        id: 55,
        title: "Venue Crisis Management",
        category: "emergency",
        description: "Handle venue-related catastrophic issues",
        premium: true,
        variables: ["venue_issue"],
        prompt: `VENUE EMERGENCY: {{venue_issue}}

IMMEDIATE RESPONSE FRAMEWORK:

Critical Assessment (First 10 minutes):
- Can event proceed at this venue? YES/NO
- If YES: How do we mitigate?
- If NO: How quickly can we relocate?

IF PROCEEDING AT VENUE:

Mitigation strategies:
[Based on issue type: power outage, flooding, etc.]
- Temporary solutions
- Vendor coordination
- Guest communication
- Safety assurance

IF RELOCATING:

Emergency venue options (in order):
1. Backup venue (if contracted)
2. Hotel ballroom (call events manager)
3. Restaurant private rooms
4. Outdoor public space (park, garden)
5. Large private home

Rapid relocation protocol:
- [ ] Call alternative venue (offer premium rate)
- [ ] Notify all vendors of address change
- [ ] Create guest communication plan:
   * Text blast
   * Signs at original venue
   * Coordinator at original entrance
- [ ] Transport logistics (shuttles if needed)
- [ ] Adjust timeline

CLIENT COMMUNICATION:

"I need to tell you about a venue situation, but first know this: your wedding is happening today, and it will be beautiful.

[Explain issue honestly]

Here's our plan:
[Present clear, confident solution]

This is why you have a planner. I've got this, and you're going to remember this as the adventure you overcame together."

VENDOR COMMUNICATION BLAST:
[Template for mass notification with new venue address, timeline, setup changes]

LEGAL DOCUMENTATION:
- Photos/video of venue issue
- Communication with venue
- All expenses incurred
- For breach of contract claim

You've trained for this. Execute with precision and confidence.`
    }
];

// ========================================
// Application State
// ========================================

let currentFilter = 'all';
let currentSearch = '';
let isPremiumUser = false; // Set via payment integration
let currentModalPrompt = null;

// ========================================
// Initialize Application
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    checkPremiumStatus();
    renderPrompts();
    attachEventListeners();
});

function initializeApp() {
    console.log('EventPrompt Pro initialized');
    // Check localStorage for premium status
    isPremiumUser = localStorage.getItem('eventprompt_premium') === 'true';
}

function checkPremiumStatus() {
    // In production, this would check actual payment status via API
    // For demo: localStorage
    if (isPremiumUser) {
        console.log('Premium user detected');
    }
}

// ========================================
// Event Listeners
// ========================================

function attachEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase();
        renderPrompts();
    });

    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active state
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // Update filter
            currentFilter = e.target.dataset.category;
            renderPrompts();
        });
    });

    // Close modal on background click
    const modal = document.getElementById('promptModal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// ========================================
// Render Prompts
// ========================================

function renderPrompts() {
    const container = document.getElementById('promptsContainer');

    // Filter prompts
    let filteredPrompts = promptDatabase.filter(prompt => {
        const matchesCategory = currentFilter === 'all' || prompt.category === currentFilter;
        const matchesSearch = currentSearch === '' ||
            prompt.title.toLowerCase().includes(currentSearch) ||
            prompt.description.toLowerCase().includes(currentSearch);

        return matchesCategory && matchesSearch;
    });

    // Render
    if (filteredPrompts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">No prompts found. Try a different search or filter.</p>';
        return;
    }

    container.innerHTML = filteredPrompts.map(prompt => {
        const isLocked = prompt.premium && !isPremiumUser;

        return `
            <div class="prompt-card ${isLocked ? 'locked' : ''}" onclick="${isLocked ? 'handleLockedPrompt()' : `openPromptModal(${prompt.id})`}">
                ${isLocked ? '<span class="lock-icon">🔒</span>' : ''}
                <span class="prompt-badge ${prompt.premium ? 'premium' : ''}">${getCategoryLabel(prompt.category)}</span>
                <h3>${prompt.title}</h3>
                <p>${prompt.description}</p>
            </div>
        `;
    }).join('');
}

function getCategoryLabel(category) {
    const labels = {
        'client': 'Client Comms',
        'vendor': 'Vendors',
        'timeline': 'Planning',
        'social': 'Social Media',
        'emergency': 'Emergency'
    };
    return labels[category] || category;
}

// ========================================
// Modal Functionality
// ========================================

function openPromptModal(promptId) {
    const prompt = promptDatabase.find(p => p.id === promptId);
    if (!prompt) return;

    currentModalPrompt = prompt;

    // Populate modal
    document.getElementById('modalTitle').textContent = prompt.title;
    document.getElementById('modalCategory').textContent = getCategoryLabel(prompt.category);
    document.getElementById('modalDescription').textContent = prompt.description;

    // Render variables if any
    const variablesSection = document.getElementById('variablesSection');
    if (prompt.variables && prompt.variables.length > 0) {
        variablesSection.innerHTML = `
            <h4 style="margin-bottom: 1rem; color: var(--text-secondary);">Customize your prompt:</h4>
            ${prompt.variables.map(variable => `
                <div class="variable-input">
                    <label for="var_${variable}">${formatVariableName(variable)}</label>
                    <input 
                        type="text" 
                        id="var_${variable}" 
                        placeholder="Enter ${formatVariableName(variable).toLowerCase()}"
                        oninput="updatePromptPreview()"
                    >
                </div>
            `).join('')}
        `;
    } else {
        variablesSection.innerHTML = '';
    }

    // Initial prompt display
    updatePromptPreview();

    // Show modal
    document.getElementById('promptModal').classList.add('active');
}

function updatePromptPreview() {
    if (!currentModalPrompt) return;

    let promptText = currentModalPrompt.prompt;

    // Replace variables with input values
    if (currentModalPrompt.variables) {
        currentModalPrompt.variables.forEach(variable => {
            const input = document.getElementById(`var_${variable}`);
            if (input) {
                const value = input.value || `{{${variable}}}`;
                promptText = promptText.replace(new RegExp(`{{${variable}}}`, 'g'), value);
            }
        });
    }

    document.getElementById('modalPrompt').textContent = promptText;
}

function closeModal() {
    document.getElementById('promptModal').classList.remove('active');
    currentModalPrompt = null;
}

function formatVariableName(variable) {
    return variable
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// ========================================
// Copy to Clipboard
// ========================================

function copyPromptText() {
    const promptText = document.getElementById('modalPrompt').textContent;

    navigator.clipboard.writeText(promptText).then(() => {
        // Visual feedback
        const copyButton = document.querySelector('.copy-button');
        const originalHTML = copyButton.innerHTML;
        copyButton.innerHTML = '<span>✓</span> Copied!';
        copyButton.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

        setTimeout(() => {
            copyButton.innerHTML = originalHTML;
            copyButton.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    });
}

// ========================================
// Locked Prompt Handler
// ========================================

function handleLockedPrompt() {
    alert('This premium prompt requires a paid plan. Scroll down to see pricing options!');
    scrollToSection('pricing');
}

// ========================================
// Utility Functions
// ========================================

function scrollToSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
}

function handlePurchase(tier) {
    if (tier === 'premium') {
        // STEP 1: Replace this with your actual Stripe Payment Link
        // Get your link from: https://dashboard.stripe.com/payment-links
        const stripePaymentLink = 'PASTE_YOUR_STRIPE_LINK_HERE';

        if (stripePaymentLink === 'PASTE_YOUR_STRIPE_LINK_HERE') {
            alert('⚠️ Setup Required\n\nTo accept payments:\n\n1. Create a Stripe account at stripe.com\n2. Create a Payment Link for $29\n3. Paste the link in app.js\n\nSee DEPLOYMENT_GUIDE.md for instructions.');
            return;
        }

        // Open Stripe payment page
        window.open(stripePaymentLink, '_blank');

        // Demo: unlock premium
        const unlock = confirm('Demo: Unlock all premium prompts?');
        if (unlock) {
            isPremiumUser = true;
            localStorage.setItem('eventprompt_premium', 'true');
            renderPrompts();
            alert('🎉 All prompts unlocked! Scroll up to explore the full library.');
        }
    } else if (tier === 'pro') {
        alert('Pro tier: This would open a contact form or Calendly link for a sales call.');
    }
}
