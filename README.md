# 🗜️ DAA Compression System
**An interactive visualization of Greedy vs. Divide & Conquer algorithms.**

![Tech Stack](https://img.shields.io/badge/Tech-Vanilla%20JS%20%7C%20HTML5%20%7C%20CSS3-00d4ff?style=flat-square)
![Dependencies](https://img.shields.io/badge/Dependencies-None-00e676?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-b388ff?style=flat-square)


## 📖 Overview
The **DAA Compression System** is an interactive, web-based educational tool designed to practically compare two fundamental approaches to data compression: **Huffman Coding** (Greedy Algorithm) and **Shannon-Fano Coding** (Divide & Conquer). 

Built entirely from scratch without any external libraries, this project visualizes how prefix-free variable-length codes are generated, calculates theoretical limits using Shannon Entropy, and provides a head-to-head "Arena" to test execution speed and space savings.

---

## ✨ Key Features
*   ⚔️ **The Arena:** A side-by-side benchmarking tool that measures execution time (in ms) and total compressed bits dynamically.
*   🌲 **Live Tree Visualizer:** Watch the binary tree build step-by-step. See Huffman build *bottom-up* and Shannon-Fano build *top-down*.
*   📊 **Custom SVG Analytics:** Features custom-built animated Donut charts, vertical timing charts, and a 5-axis Radar chart to measure performance—all built in pure SVG.
*   📐 **Theoretical Benchmarking:** Compares all results against the absolute mathematical limit of **Shannon Entropy L(X)**.
*   🎨 **Premium UI/UX:** A modern, dark-mode glassmorphism interface designed for clarity and engagement.

---

## 🧠 The Algorithms

### 1. Huffman Coding (The Greedy Approach)
Huffman coding makes the **locally optimal choice** at each step by continually merging the two characters with the lowest frequency using a Min-Heap. 
*   **Time Complexity:** `O(n log n)`
*   **Space Complexity:** `O(n)`
*   **Optimality:** Guaranteed optimal for symbol-by-symbol encoding. Proven via the *Exchange Argument*.

### 2. Shannon-Fano (Divide & Conquer)
A top-down recursive heuristic that sorts characters by frequency and repeatedly splits them into two groups whose probability sums are as equal as possible.
*   **Time Complexity:** `O(n log n)`
*   **Space Complexity:** `O(n)`
*   **Optimality:** Sub-optimal. The equal-splitting heuristic can occasionally assign longer codes to more frequent characters.

---

## 🚨 The Edge Case 
While both algorithms often perform similarly on standard English text, Shannon-Fano's heuristic breaks down on heavily skewed probability distributions. 

**Try loading the "Edge Case" in The Arena:**
`AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBBBBBBBBBBBBBBBCCCCCCCCCCCCCCCCCDDDDDDDDDDDDDDDDEEEEEEEEEEEEEEE`

This specific string mathematically proves Shannon-Fano's flaw, demonstrating a scenario where Huffman's greedy bottom-up merge guarantees a more efficient encoding space.

---

## 🚀 How to Run Locally

This project requires **zero installations, no package managers, and no build steps**. Because it relies on ES6 modules and modern JS features, it simply needs to be served over a local HTTP server (opening `index.html` directly from the file system via `file://` may trigger CORS errors for module imports).

### Method 1: Using Python (Recommended, pre-installed on Mac/Linux)
1. Open your terminal.
2. Navigate to the project directory:
   ```bash
   cd path/to/huffman-coding-compression-system
   ```
3. Start the built-in HTTP server:
   ```bash
   python -m http.server 5500
   ```
   *(If you are on Python 2, use `python -m SimpleHTTPServer 5500`)*
4. Open your browser and navigate to: `http://localhost:5500`

### Method 2: Using Node.js / NPX
1. Open your terminal in the project directory.
2. Run the `serve` package directly without installing it:
   ```bash
   npx serve .
   ```
3. Open the `localhost` link provided in the terminal output.

### Method 3: Using VS Code
1. Open the project folder in Visual Studio Code.
2. Install the **Live Server** extension by Ritwick Dey.
3. Right-click on `index.html` and select **"Open with Live Server"**.

---

## 🛠️ Project Architecture
The codebase is structured for strict separation of concerns:
*   `index.html` — The main application DOM and routing structure.
*   `style.css` — CSS variables, glassmorphism UI, and keyframe animations.
*   `app.js` — The application controller (UI bindings, routing, SVG generation).
*   `huffman.js` — Core logic for Min-Heap, greedy merging, and DFS traversal.
*   `shannon_fano.js` — Core logic for frequency sorting and recursive splitting.
*   `visualizer.js` — SVG coordinate mathematics for the step-by-step tree visualizer.

---

*Developed as a Design and Analysis of Algorithms (DAA) Course Project*
