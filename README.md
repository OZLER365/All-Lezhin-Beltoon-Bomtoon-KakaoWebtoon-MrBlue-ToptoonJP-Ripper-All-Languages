**Universal Image Downloader for Lezhin, Beltoon, Bomtoon, Kakao-Webtoon, Mr-Blue, and Toptoon (JP)**

A lightweight, highly optimized Tampermonkey userscript designed to seamlessly capture and download high-quality original images from supported webtoon platforms. By directly hooking into the browser's native Blob memory and utilizing DOM-based page ordering, this script bypasses complex canvas descrambling and guarantees perfect image sequences.

### 📥 Installation & Links

* **Install via GreasyFork:** [Webtoon Ripper Userscript](https://greasyfork.org/en/scripts/563063-all-lezhin-beltoon-bomtoon-kakao-webtoon-mr-blue-toptoon-jp-ripper-all-languages?utm_source=gemini) *(Tampermonkey recommended)*
* **GitHub Repository:** [View Source](https://github.com/OZLER365/All-Lezhin-Beltoon-Bomtoon-KakaoWebtoon-MrBlue-ToptoonJP-Ripper-All-Languages?utm_source=gemini)
* **Developer Portfolio:** [Ozler's Works](https://ozler365.github.io/ozler-s-works-info/?utm_source=gemini#/repositories)

---

## ✨ Core Features

* **Direct Memory Hooking:** Intercepts `blob:`, `rcdn`, and `ccdn` images at the network/memory level. No canvas manipulation or descrambling required.
* **Smart UI & SPA Support:** Features a persistent, draggable floating control panel. Native Single Page Application (SPA) anti-wipe architecture ensures the UI immediately regenerates across soft navigations.
* **Persistent Auto-DL:** Toggle automatic downloading on/off. The script remembers your choice across page refreshes and different supported domains.
* **Repeat Download Safeguard:** If you trigger a download multiple times on the same chapter, the script natively tracks the title and prefixes folders with `Re1`, `Re2`, etc., to prevent file overwrites.
* **Folder-Based Organization:** Downloads individual high-quality images directly into properly named local folders (ZIP extraction is not used).

---

## 🌐 Supported Platforms & Languages

* **Languages:** English, Japanese, Korean, Thai, French, German, Spanish, Chinese/Taiwanese.
* **Platforms:**
* `lezhinus.com` / `lezhin.com`
* `lezhin.jp` / `lezhin.es` / `lezhinde.com` / `lezhinfr.com` / `lezhinth.com`
* `beltoon.jp`
* `bomtoon.com` / `bomtoon.tw`
* `webtoon.kakao.com`
* `viewer.mrblue.com` / `mrblue.com`
* `toptoon.jp` *(Note: Other Toptoon regional variants are **not** supported).*



---

## ⚙️ How It Works (Site-Specific Behaviors)

Due to how different platforms handle lazy-loading, the script automatically adapts its behavior based on the site you are visiting:

### Platforms Requiring Auto-Scroll

**Applies to: Lezhin (English), Lezhin (Korean), Lezhin (Japan), and Toptoon (Japan).**
These sites strictly monitor viewport movement to load images.

* **Usage:** You must click the **"Scroll"** button. The script will automatically jump through the chapter (85% viewport jumps).
* **Smart Pausing:** When the script detects an unloaded image container, it halts scrolling indefinitely until the image successfully injects into the DOM, ensuring no missing pages.
* **Toptoon JP Custom Naming:** Toptoon JP uses a heavily isolated architecture. The script dynamically scrapes the `.subTit` and `.tit` DOM elements to create perfectly formatted download folders (e.g., `Series Name 4話`).

### Platforms NOT Requiring Auto-Scroll

**Applies to: Bomtoon, Kakao-Webtoon, Beltoon, and Mr-Blue.**
These sites preload images into memory without strict viewport detection.

* **Usage:** Auto-scrolling is completely optional.
* **Auto-Capture:** The script silently counts captured images in the background. Once the internal counter stops detecting new images for 5 seconds, it will automatically trigger the download (if the "Auto DL" toggle is active).
* **Mr-Blue:** Captures the entire chapter's raw images instantly based entirely on your internet connection speed.

---

## ⚠️ Important Notes

* **Ignore the UI Page Counter:** The script's `Download (X/Y)` counter may occasionally display an incorrect total page estimate. Do not panic. Some sites hide total page counts, so the script falls back to reading progress bars. It will still successfully capture 100% of the loaded images.
* **Image Delivery:** Files are fetched using `GM_download`. Ensure your browser settings allow for multiple file downloads to prevent permission popups.

---

## ☕ Support the Developer

Maintaining and optimizing this script to bypass continuous site updates takes significant time and hard work. If this script helped you, please consider supporting its ongoing development!

**Help Keep This Userscript Updated and Running Smoothly With a Small Donation:**

[Buy Me a Coffee ☕](https://buymeacoffee.com/ozler?utm_source=gemini)

**Feedback, Queries, or Feature Requests:**

* Leave a review on [GreasyFork](https://greasyfork.org/en/scripts/563063-all-lezhin-beltoon-bomtoon-kakao-webtoon-mr-blue-toptoon-jp-ripper-all-languages?utm_source=gemini).
* Email: `devjk6918@gmail.com`

---

> **Disclaimer:** This script is developed strictly for educational and personal archiving purposes. Users are responsible for adhering to the terms of service of the respective platforms. Please respect the original creators and **do not** re-upload, repost, or distribute downloaded images.
