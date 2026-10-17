# Skopje Wrapped

**Discover Skopje. Connect through culture. Create your own story.**

Skopje Wrapped is an interactive platform that makes the cultural life of Skopje more accessible, engaging, and social. Through a personalized map, cultural challenges, and monthly statistics, users track their visits to exhibitions, concerts, theatres, cinemas, galleries, and other cultural spaces.

The platform encourages young people to explore the city, discover new places, and connect with others who share their interests.

## Key Features

- **Personal Cultural Map** — Discover new locations and track the areas of Skopje you have explored.
- **Profile & Statistics** — Keep track of your visits, cultural interests, and personal achievements.
- **Cultural Crews** — Meet people with similar interests and organize cultural outings together.
- **Neighborhood Challenges** — Explore different parts of the city and earn badges through themed activities.
- **Monthly Wrapped** — Receive personalized visual cards highlighting your cultural experiences, ready to share on social media.
- **Skopi AI** — Your personal cultural guide, offering event recommendations, stories about local places, and help finding company for your next outing.

## Skopi — Your AI Cultural Guide

Skopi is an intelligent assistant integrated into the platform, designed to help every user experience Skopje in their own way.

With Skopi, you can:

- Discover cultural events based on your interests, budget, and availability.
- Connect with people who share your interests and organize cultural outings together.
- Explore stories about historical landmarks, art, and architecture.
- Receive personalized challenges and recommendations for discovering new neighborhoods.
- Generate unique, personalized texts for your monthly Wrapped.

## Monthly Wrapped

At the beginning of each month, users receive a personalized recap of their cultural activities through three visual cards.

1. **My Month** — Visited places, explored neighborhoods, and cultural achievements.
2. **My Map** — A visual representation of the areas of the city they have explored.
3. **My Cultural Identity** — A personalized cultural profile, favorite categories, and most-visited places.

The cards are designed to be shared on social media, turning personal experiences into inspiration for others to discover Skopje's cultural scene.

## Our Mission

Skopje Wrapped aims to connect young people with culture, local artists, and one another. Through technology, personalization, and shared experiences, the platform encourages a more active cultural life and a deeper connection with the city.

**Explore more. Experience culture. Discover your Skopje.**

---

## Prototype — AI Hackathon HACKTOBERFEST 2026 · Base42

Built in one day for the **FIX MY CITY** theme. A mobile-first web app, no build step.

**Live demo flow:** scan a QR sticker → Skopi tells the story of the place → the zone on your map lights up → open your Wrapped and get an AI-written cultural persona + an Instagram card.

### Open-source AI
Skopi runs on **open-weight models (Llama) via the Groq API**. Skopi only answers from our own knowledge base of places and events (`js/data.js`), so it doesn't invent events or history. Without a key or internet the app falls back to offline answers, so the demo never breaks.

### Run it
1. Open the app (GitHub Pages, or locally: `python3 -m http.server` in this folder → http://localhost:8000).
2. **Профил → AI поставки** → paste a free Groq API key (https://console.groq.com/keys) → **Зачувај и тестирај**. The key is stored only in your browser.
3. Open `qr.html` to print QR stickers. Each QR opens `?place=<id>` and checks you in automatically.

### Structure
```
index.html      the app
qr.html         printable QR stickers
css/style.css   styles
js/data.js      Skopi's knowledge: places, stories, events (edit here!)
js/ai.js        Skopi: Groq calls + offline fallback
js/app.js       map, check-in, feed, chat, Wrapped, profile
lib/            Leaflet, html5-qrcode, html2canvas, qrcode-generator (vendored)
```

### License
MIT
