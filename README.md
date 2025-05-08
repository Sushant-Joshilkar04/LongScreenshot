# 📸 Area Screenshot Chrome Extension

This is a Chrome Extension that allows you to **capture a screenshot of any selected area** on a webpage. The extension also auto-scrolls the page if needed and stitches off-screen content to form a full screenshot of the selected region.

## ⚙️ Features

- Select an area by **dragging your mouse**.
- Auto-scrolls if you reach the edge of the viewport.
- Captures **off-screen parts** by scrolling and stitching.
- Press **`Ctrl + Shift + Y`** to start the selection.
- Final screenshot is downloaded as an image.

## 🧪 How to Install (Manual / Free Distribution)

1. **Download or Clone the Repo**
   - Click the green `Code` button above and choose `Download ZIP`, or run:
     ```bash
     git clone https://github.com/Sushant-Joshilkar04/LongScreenshot.git
     ```

2. **Unzip and Load into Chrome**
   - Go to `chrome://extensions` in your Chrome browser.
   - Enable **Developer Mode** (top-right toggle).
   - Click **"Load unpacked"**.
   - Select the folder where the extension files are located.

3. **You're Done!**
   - Now press **`Ctrl + Shift + Y`** on any page to start area screenshot selection.

## 📦 Files Included

- `manifest.json` – Chrome extension manifest file
- `background.js` – Handles keyboard shortcut
- `content.js` – Handles screen selection logic
- `popup.html` – UI 

## 🛠 Shortcut Configuration

The default shortcut is:

- `Ctrl + Shift + Y`

To change it:
1. Go to `chrome://extensions/shortcuts`
2. Find the extension
3. Click in the shortcut field and press your desired keys

## 📸 Output

The captured screenshot will automatically be downloaded in `.png` format once the area is selected.

