# Skopje Wrapped

**Strava for culture in Skopje.** Every exhibition, concert and show you visit lights up your map of the city, and Skopi, your AI culture buddy, tells you where to go next.

**Live app:** https://skopjewrapped.vercel.app/
Open it on your phone. No install, no sign-up.

**Demo video:** https://youtube.com/shorts/OT3f29CtizU

Built at **AI Hackathon HACKTOBERFEST 2026 · Base42 · FIX MY CITY**.

---

## The problem

Skopje has galleries, concerts, theatres and cultural spaces, but many young people don't know where to go or don't have anyone to go with, and rarely leave their own neighbourhood. Venues stay half-empty, and the city has no data on which neighbourhoods lack cultural life.

## The solution

A mobile web app that turns culture into a shared game:

- **Check in** by scanning a QR sticker at a cultural venue, or just take a photo and the AI recognises the activity.
- **Personal map** of Skopje that lights up as you explore new neighbourhoods.
- **Skopi, the AI buddy** that suggests what to do tonight based on your budget, time and interests, and tells you the story of the place you're standing in.
- **Weekly challenge** from Skopi: an event in a neighbourhood you haven't visited yet.
- **Crews:** get matched with 4–6 people with similar interests, with a group chat and a meet-up point.
- **Friends:** follow people, react to their outings, invite them to events with a QR code or link.
- **Monthly Wrapped:** an AI-written story of your month with a cultural persona and a card to share on Instagram.
- **Neighbourhood League** and badges.
- **Macedonian and English.**

## Skopi: how the AI works

Skopi runs on **open-weight models (Llama) via the Groq API**:

| Feature | Model |
| --- | --- |
| Chat, place stories, weekly challenge, Wrapped texts, crew chat | Llama 3.3 70B |
| Recognising a photo of a cultural activity | Llama 4 Scout (vision) |

Skopi **does not invent events or facts**. It only answers from our own knowledge base of places, stories and events (`js/data.js`). If there is no API key or no internet, the app falls back to offline answers, so it never breaks.

## Tech stack

Plain HTML, CSS and JavaScript, no build step.

- [MapLibre GL JS](https://maplibre.org/) with the CARTO Positron basemap (OpenStreetMap data)
- [html5-qrcode](https://github.com/mebjas/html5-qrcode) for scanning QR codes
- [html2canvas](https://html2canvas.hertzen.com/) for the shareable Wrapped card
- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) for venue stickers and invite codes
- [Groq API](https://console.groq.com/) for open-weight LLM inference
- Hosted on GitHub Pages
- Hosted on [Vercel](https://vercel.com/), deployed automatically from this repository

## Run it locally

```bash
git clone https://github.com/milajovanovska/Skopje-Wrapped.git
cd Skopje-Wrapped
python3 -m http.server 8000
```

Then open http://localhost:8000

### AI key (optional)

Get a free key at https://console.groq.com/keys. Then either:

- open the app once with `?key=gsk_YOUR_KEY` at the end of the URL (the key is saved only in that browser), or
- copy `js/config.local.example.js` to `js/config.local.js` and put your key there. This file is in `.gitignore` and is never committed.

## Project structure        
                                                                                                                  ndex.html the app
```
index.html       the app
qr.html          printable QR stickers for venues
css/style.css    styles
js/data.js       Skopi's knowledge: places, stories, events, neighbourhoods
js/ai.js         Skopi: Groq calls + offline fallback
js/app.js        map, check-in, Happening feed, crews, chat, Wrapped, profile
js/i18n.js       Macedonian and English texts
js/icons.js      SVG icons
lib/             vendored libraries
```

## Privacy

- All user data in the prototype stays in the user's own browser.
- Skopi never shares other users' locations and never comments on how people look.
- Crews are only groups of 4–6 people, meeting at public cultural venues.

## Team

- Sara Andonovska
- Mila Jovanovska
- Evica Isaevska

## License

MIT

