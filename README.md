# People of Jaipur

A walkable 3D Pink City where people, shops and companies meet. The site is live at **peopleofjaipur.com**.

## What's in this repository

| Path | What it is |
|---|---|
| `index.html` | The built site that Netlify publishes. Don't edit it by hand: it's rebuilt from `src/`. |
| `src/` | The source: page layout and styles (`head.html`) and the city code (`p1.js` to `p7.js`). |
| `build.py` | Rebuilds `index.html` from `src/`. |
| `platform.js` | Connects the city to Supabase (sign-in, saving, chat, live visitors, connections). |
| `config.js` | Your Supabase project details. |
| `schema.sql` | The database setup for Supabase. |
| `netlify.toml` | Tells Netlify to publish this folder as it is. |

## Making changes

1. Edit files in `src/`, or replace them with updated versions.
2. Run `python3 build.py` to rebuild `index.html`.
3. Commit and push:
   ```
   git add -A
   git commit -m "Describe the change"
   git push
   ```
4. Netlify publishes the update to peopleofjaipur.com within a minute or two.

## Putting this on GitHub for the first time

1. On github.com, signed in as **amsoorya**, click **New repository**. Name it `peopleofjaipur`, leave it empty with no README, and create it.
2. In this folder, which already has its first commit, run:
   ```
   git remote add origin https://github.com/amsoorya/peopleofjaipur.git
   git branch -M main
   git push -u origin main
   ```
   If you'd rather not use the command line, GitHub Desktop works too. Use **File**, then **Add local repository**, pick this folder, then **Publish**.
3. In Netlify, click **Add new site**, then **Import an existing project**, then **GitHub**. Pick `amsoorya/peopleofjaipur`. Leave the build command empty and the publish directory as `.`, then deploy.
4. Add the custom domain in Netlify and point GoDaddy at it, as in Step 5 below.

From then on, every push to `main` goes live automatically.

**Public or private:** the repository can be either. `config.js` only ever holds the public Supabase *anon* key, which is safe to publish. Never commit the `service_role` key.

---

# Setting up the live site

This folder is the whole website. The city itself is static: three files your host serves as they are.

The social side lives in **Supabase**, which is free to start: sign-in, profiles, shops, companies, chat, connections, meets and clubs. Until you fill in `config.js`, the site still works for walking, riding, flying and exploring, just without sign-in.

## How it works for the people who visit

1. **They arrive.** A short flyover plays, then they pick how they're joining:
   - just exploring
   - as an individual
   - as a business, which takes a shop
   - as an IT company, which takes a floor in the Tech Park

   First-time visitors also see a short guide to everything they can do.
2. **They verify their email.** Anything beyond exploring asks them to sign in. They type their email, get a 6-digit code, and paste it in. No passwords. If you turn on LinkedIn sign-in, there's a "Continue with LinkedIn" button too.
3. **They set up a profile.** This has their name, what they do and what they're building, plus their LinkedIn, X, Instagram, GitHub and website. They can also pick the company they work at, which that company then confirms.
4. **They connect.** On someone's card they tap **Connect**, and the other person gets a notification.
   - If they **Accept**, both are told, and private messages unlock.
   - Each can then see the other's LinkedIn and other links. **The database enforces this:** nobody else can read those links or messages, not even other signed-in users.
   - If they **Decline**, the request simply shows as not accepted.
5. **They meet up.** On the **community board**, anyone signed in can:
   - organise a meet with a date, place, optional online link and number of spots
   - join or leave a meet
   - start a club, or join one
   - use the chat that every meet and club has

   The board is in the Menu, in Explore, and on notice boards at Badi Chaupar, Central Park and the Tech Park.
6. **Businesses and companies:**
   - **Shops:** a shop's shutters go up when a business registers it. Visitors see its products, store link and directions, and can message it.
   - **Companies:** a company takes a floor, adds a logo and posts open roles with apply links. It also confirms the people who say they work there.

## Setting it up (about 45 minutes, plus waiting for the domain)

### Step 1. Supabase
1. Create a free account at supabase.com and a new project. Pick the Mumbai region if it's offered.
2. Open **SQL Editor**, choose **New query**, paste all of `schema.sql` and click **Run**.
3. Open **Project Settings**, then **API**. Copy the **Project URL** and the **anon public** key into `config.js`.

   The anon key is meant to be public, because the database rules protect the data. Never put the `service_role` key in this folder.

### Step 2. Email codes
1. In Supabase, open **Authentication**, then **Sign In / Providers**, and make sure **Email** is on.
2. Open **Authentication**, then **Email Templates**, then **Magic Link**. Make the email show the code, for example:
   `Your People of Jaipur code is {{ .Token }}`

   The template needs `{{ .Token }}` for people to receive a code. Without it, they get a link instead.
3. Open **Authentication**, then **URL Configuration**:
   - Set **Site URL** to `https://peopleofjaipur.com`
   - Add `https://peopleofjaipur.com` and `https://www.peopleofjaipur.com` to the redirect URLs
4. **For real traffic, use your own email sender.** Supabase's built-in sender only allows a few emails an hour and is meant for testing. Under **Authentication**, then **Emails**, then **SMTP Settings**, connect a sending service such as Resend, Brevo or Amazon SES. Several have free tiers. Send from an address like `hello@peopleofjaipur.com` so the codes don't land in spam.

### Step 3 (optional). LinkedIn sign-in
1. Go to the LinkedIn Developer portal and create an app. It needs to be linked to a LinkedIn Page.
2. Under **Products**, add **Sign In with LinkedIn using OpenID Connect**.
3. Under **Auth**, add the redirect URL `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`.
4. In Supabase, open **Authentication**, then **Providers**, then **LinkedIn (OIDC)**. Turn it on and paste the Client ID and Secret.
5. In `config.js`, set `linkedin: true`.

### Step 4. Put the site online with Netlify (easiest with a GoDaddy domain)
You keep your domain and its DNS at GoDaddy. You only change two records, and Netlify handles HTTPS for you.

1. Create a free account at netlify.com.
2. Open **Add new site**, then **Import an existing project**, then **GitHub**, and pick `amsoorya/peopleofjaipur`. Leave the build command empty and the publish directory as `.`. (You can also choose **Deploy manually** and drag in this folder.) Netlify gives you an address like `something.netlify.app`.
3. Open **Site configuration**, then **Change site name**, and set it to `peopleofjaipur`. Your address becomes `peopleofjaipur.netlify.app`.
4. Open **Domain management**, then **Add a domain**. Type `peopleofjaipur.com` and confirm. Netlify adds `www.peopleofjaipur.com` too.

### Step 5. Point peopleofjaipur.com at Netlify from GoDaddy
1. Sign in to GoDaddy and open your **Domain Portfolio**. Click `peopleofjaipur.com`, then the **DNS** tab.
2. Find the **A** record with Name **@**. Click **Edit** and set its value to `75.2.60.5`, then save.

   If there's a second A record with Name @, or an AAAA record with Name @, delete it.
3. Find the **CNAME** record with Name **www**. Click **Edit** and set its value to `peopleofjaipur.netlify.app`, then save.
4. If GoDaddy asks for a verification code, enter the one it emails you. This is GoDaddy's own Domain Protection check.
5. Back in Netlify, under **Domain management**, wait for both domains to show as ready. Netlify then issues the HTTPS certificate on its own. This is usually under an hour, and can take up to a day.

Always use the values Netlify shows in its own Domain management screen. If they differ from the ones above, Netlify's are correct.

**Updating the site later:** push to GitHub and Netlify publishes it. If you deployed by dragging the folder instead, open **Deploys** and drag the folder in again.

**Alternative:** you can host on Cloudflare Pages instead. That means moving the domain's nameservers from GoDaddy to Cloudflare. It's free too, but it's one more change to make.

If you set up the database with an older copy of `schema.sql`, run only the parts you don't have yet:
- the **Connections**, **Social links** and **Direct messages** tables
- the **Company logos** storage
- the updated list of collections at the top

## Who can see what

| Data | Who can read it | Who can change it |
|---|---|---|
| Profiles, shops, companies, job posts, meets, clubs, public chat | Everyone | Only the person who made it |
| Connection requests | The two people involved | The requester creates a request; the other person answers it |
| Social links (LinkedIn, X, Instagram, GitHub, website) | You, and people you've accepted | Only you |
| Direct messages | Only the two people in the conversation | Only accepted connections can send them |
| Company logos | Everyone | Only the uploader, inside their own folder |

## Looking after the community
- **Removing things:** in **Table Editor**, the `docs` table holds profiles, shops, companies, chat, meets and clubs, one row per person per kind. Delete a row to remove it.
- **Blocking someone:** under **Authentication**, then **Users**, delete or ban the account. Everything they posted is removed with it.
- **Free plans** have limits on users, storage and live connections, and a free Supabase project can pause after a period with no visitors. Check current plans as the community grows.
