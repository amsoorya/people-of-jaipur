# People of Jaipur

**A walkable 3D Pink City where people, shops and companies meet.**

Walk, ride an auto, hop on a camel or fly over a hand-built 3D Jaipur — then meet the designers, builders, shops and companies who've set up there.

🌐 **Live:** [peopleofjaipur.com](https://peopleofjaipur.com)

> **Inspired by [People of Bengaluru](https://peopleofbengaluru.com/).** That project showed how fun it is to meet a city's community by walking around a 3D version of it. People of Jaipur is our take on the idea for the Pink City. Full credit to the People of Bengaluru team for the original idea.

---

## Everything you can do here

### 🚶 Move around
| Action | Keyboard | Phone |
|---|---|---|
| Walk forward / back | `W` / `S` (or arrow keys) | Joystick |
| Turn | `A` / `D` | Joystick |
| Run | Hold `Shift` (or turn on *Always run* in the Menu) | Run button |
| Look around | Drag the mouse | Drag |
| Zoom | Scroll | Pinch |
| Fly over the city | `F` | Fly button |
| Open the map (tap anywhere to go there) | `M` | Map button |
| Interact with whatever is nearby | `E` | Tap the button that appears |
| Close a panel | `Esc` | Close button |

### 🔑 The one key you need: `E`
Walk up to something and a button appears at the bottom of the screen. Press `E` (or tap it) to:
- enter shops and towers
- call lifts and go up to office floors
- sit at café tables and on steps
- ride vehicles and animals
- meet the people walking around

### 🛺 Get around Jaipur
- **Autos:** stop a passing auto-rickshaw and drive it yourself
- **Scooters:** pick one up from a scooter stand
- **Camels:** ride one at Jal Mahal
- **Jeep:** take it up to Sunset Point, or walk the spiral road
- **Horn:** press `H` to honk (it scatters the cows, camels and pigeons nearby)
- **Seat view:** press `V` in a vehicle to see from the driver's seat

### 🏰 Places to visit
Hawa Mahal · Jantar Mantar · Jal Mahal · City Palace · Albert Hall · Patrika Gate · Sanganeri Gate · Badi Chaupar · Johari Bazaar · Central Park · Gaurav Tower · Sunset Point (Nahargarh) · Jagatpura Tech Park · Anokhi Café · Wind View Café, plus city streets, animals, traffic and chai stalls.

### 🌅 Make it yours
- **Time of day:** switch between Day, Dusk and Night from the Menu
- **Music:** turn the background music on or off
- **Outfit:** choose a kurta, shirt or lehenga, a turban, odhni or hairstyle, colours and skin tone. Everyone else walking the city sees your look too.

### 🤝 Join the city
From the Menu, pick **Register as an individual, business or company**:
- **Individual:** a profile (name, what you do, what you're building, LinkedIn, X, Instagram, GitHub, website) and a spot in the city. You can say which company you work at and that company confirms you.
- **Business:** take one of **205 shops**. The shutters go up, and visitors can browse your products, open your store link, get directions and message you.
- **IT company:** take one of **18 floors** in the Jagatpura Tech Park. Add your logo and post open roles with apply links.

Sign-in is passwordless: enter your email, get a 6-digit code, paste it in. LinkedIn sign-in can be turned on too.

### 💬 Meet people
- **See who's around:** Explore → People shows who is online and who has joined. Walk up to someone online to wave.
- **Connect:** open a profile and tap *Connect*. When they accept, you're both told, **private messages unlock**, and you can see each other's social links.
- **Meets:** organise one with a date, place, optional online link and number of spots, or join someone else's.
- **Clubs:** start or join a club, each with its own chat.
- **Community board:** in the Menu, or on notice boards at Badi Chaupar, Central Park and in the Tech Park lobbies.
- **Chat:** sit at any café table to join that café's chat, use City chat from the Menu, or message a shop owner directly.
- **Notifications:** connection requests, accepted connections and new messages, all in the Menu.

### 🔒 Privacy
Your social links and private messages are protected by the database itself (Supabase row-level security). Only you and people you've accepted can read them, not even other signed-in users. See [Who can see what](#who-can-see-what).

---

## Tech

- **3D city:** plain JavaScript and WebGL, shipped as one static `index.html` with no build tools to install
- **Backend:** [Supabase](https://supabase.com) for auth (email OTP + optional LinkedIn OIDC), Postgres with row-level security, realtime presence and chat, and storage for company logos
- **Hosting:** [GitHub Pages](https://pages.github.com), published on every push to `main`

## What's in this repository

| Path | What it is |
|---|---|
| `index.html` | The built site that GitHub Pages serves. Don't edit it by hand: it's rebuilt from `src/`. |
| `src/` | The source: page layout and styles (`head.html`) and the city code (`p1.js` to `p7.js`). |
| `build.py` | Rebuilds `index.html` from `src/`. |
| `platform.js` | Connects the city to Supabase (sign-in, saving, chat, live visitors, connections). |
| `config.js` | Your Supabase project details. |
| `schema.sql` | The database setup for Supabase. |
| `CNAME`, `.nojekyll` | Tell GitHub Pages to serve this folder as it is at peopleofjaipur.com. |

## Running it locally

```
git clone https://github.com/amsoorya/people-of-jaipur.git
cd people-of-jaipur
python3 -m http.server 8000
```

Open http://localhost:8000. Without Supabase details in `config.js`, you can still walk, ride, fly and explore, just without signing in.

## Making changes

1. Edit files in `src/`.
2. Run `python3 build.py` to rebuild `index.html`.
3. Commit and push:
   ```
   git add -A
   git commit -m "Describe the change"
   git push
   ```
4. GitHub Pages publishes the update to peopleofjaipur.com within a minute or two.

`config.js` only ever holds the public Supabase *anon* key, which is safe to publish. **Never commit the `service_role` key.**

## Credits

- Inspired by **[People of Bengaluru](https://peopleofbengaluru.com/)**
- Office furniture and food: **[Kenney](https://kenney.nl)** (Furniture Kit, Food Kit, City Kit Commercial), CC0
- Trees and bushes: Quaternius Stylized Nature MegaKit, CC0
- People, cows and bulls: **[Quaternius](https://quaternius.com)** (Ultimate Modular Men, Ultimate Modular Women, Ultimate Animated Animals), CC0
- "[Auto Rickshaw](https://sketchfab.com/3d-models/auto-rickshaw-44776bcb34e04c1a8b9c18a70376304e)" by [rSquare](https://sketchfab.com/rSquare), [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
- "[camel](https://sketchfab.com/3d-models/camel-44ef2ea4b50a49e395e5e3ebbdc99f98)" by [omarme37](https://sketchfab.com/omarme37), [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
- "Thai Tuk Tuk 3D model (PBR, real-time)" from Sketchfab, used under its open licence
- "[Cow](https://sketchfab.com/3d-models/cow-f3caeee78b4d42978493d92209e56943)" by Asheraf, [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
- "Brahman Cow" by kunyong_Chen, "Pigeon" by hino, "Scooter Motorcycle" by NORBERTO-3D and "Cyberpunk Scooter" by Berk Gedik on Sketchfab, [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
- "Jeep 1" by Kapi777, [CC BY-NC 4.0](http://creativecommons.org/licenses/by-nc/4.0/)
- "Bactrian Camel (Low Poly)" by [Nyilonelycompany](https://sketchfab.com/Nyilonelycompany), [CC BY-NC-SA 4.0](http://creativecommons.org/licenses/by-nc-sa/4.0/) (non-commercial use only)
- Built for the people of Jaipur 🩷

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

### Step 4. Put the site online with GitHub Pages
The site is plain static files, so GitHub Pages serves this repository as it is. It's free and adds no badge.

1. On GitHub, open the repository's **Settings**, then **Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**, pick `main` and `/ (root)`, and save.
3. Under **Custom domain**, enter `peopleofjaipur.com` and save. (The `CNAME` file in this repo keeps it set.)

### Step 5. Point peopleofjaipur.com at GitHub from GoDaddy
1. Sign in to GoDaddy and open your **Domain Portfolio**. Click `peopleofjaipur.com`, then the **DNS** tab.
2. Make the `@` **A** records exactly these four (edit the existing one, add the rest):
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
3. Set the **CNAME** record with Name **www** to `amsoorya.github.io`.
4. Back in GitHub **Settings → Pages**, wait for the DNS check to pass, then tick **Enforce HTTPS**. The certificate is usually ready within an hour.

**Updating the site later:** push to `main` and GitHub Pages publishes it within a minute or two.

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
