# WASL LIVE — real multi-device audio room

## What works
- Real LiveKit audio between separate phones/browsers.
- Room name matching: users who enter the same room name meet in the same room.
- Microphone enable/disable, remote audio playback, participant list and real-time text chat.
- Three decorative bot/avatar cards. They are visual placeholders, not AI voice agents.

## Critical: rotate the exposed API secret
The LiveKit API secret shown in the screenshot has been exposed. Revoke/delete that key in LiveKit Cloud and create a NEW key. Use only the new key here. Never paste the secret into HTML, chat, GitHub, or a public file.

## Deploy on Render
1. Create a PRIVATE GitHub repository and upload this project.
2. Render > New > Web Service > connect the repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables from `.env.example` in Render dashboard. Set `ALLOWED_ORIGINS` to the exact public Render URL of this app, e.g. `https://wasl-live-demo.onrender.com` (no trailing slash).
6. Deploy. Visit `https://YOUR-APP.onrender.com/health` and expect `{"ok":true,"service":"wasl-live"}`.
7. Open the root URL. On two devices, enter the same room name, join, and enable microphone. Both devices must allow microphone access. HTTPS is required.

## If deploying frontend separately
This package serves the frontend and `/api/token` from the same Render origin, which avoids cross-origin setup. If you host the HTML separately, update fetch('/api/token') to the full backend endpoint and configure CORS `ALLOWED_ORIGINS` with the exact frontend origin.

## Notes
- `LIVEKIT_URL` is the WebSocket URL from the LiveKit project, not the website URL.
- The API key and secret belong only in Render environment variables.
- The client asks for microphone permission only after the user presses the microphone button.
- Browsers require HTTPS (or localhost) for microphone access.
- This is an open guest-room prototype: anyone who can reach the public app may request a guest token. Add Firebase Auth/App Check, moderation, room limits and stronger abuse controls before public launch.
- Bot cards are only visual. To make AI bots speak audibly to all participants, build and deploy a LiveKit Agent/worker that joins the room and publishes generated audio. Browser speech synthesis alone would only be heard locally.
