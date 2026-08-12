# Resize Engine — Image Resizer

A dark, futuristic, fully client-side image resizer. Upload an image, resize
it by exact pixel dimensions or by target file size (KB), pick an output
format, and download the result. No server, no upload — everything runs
in the browser via the Canvas API.

## Features

- Drag-and-drop or click-to-browse upload
- Resize by width/height in pixels, with optional aspect-ratio lock
- Resize by target file size in KB (auto-tunes compression to get close)
- Output formats: JPG, PNG, WebP
- Adjustable quality slider
- Quick-pick presets (256/512/1024/2048px, and 50/100/200/500/1000KB)
- Fully static — works from any web host, including GitHub Pages

## Run locally

Just open `index.html` in a browser. No build step, no dependencies to install.

(Optional, if your browser blocks local file access for fonts/scripts:
run a tiny local server instead, e.g. `python3 -m http.server` from this
folder, then visit `http://localhost:8000`.)

## Deploy to GitHub Pages

1. Create a new GitHub repository (or use an existing one).
2. Push these files to it, keeping the folder structure:
   ```
   your-repo/
   ├── index.html
   ├── assets/
   │   ├── style.css
   │   └── script.js
   └── README.md
   ```
   ```bash
   git init
   git add .
   git commit -m "Add image resizer"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
3. On GitHub, go to your repo → **Settings** → **Pages**.
4. Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
5. Set **Branch** to `main` and folder to `/ (root)`, then **Save**.
6. Wait a minute, then your site will be live at:
   ```
   https://<your-username>.github.io/<your-repo>/
   ```

That's it — no build process, no GitHub Actions required.

## Notes

- Images never leave the browser; resizing happens locally on the canvas.
- PNG output ignores the quality slider (PNG is lossless) and the "target
  file size" mode falls back to a single PNG export for that format, since
  PNG has no quality knob to tune.
