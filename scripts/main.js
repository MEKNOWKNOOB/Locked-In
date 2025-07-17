//const pageDisplay = document.getElementById("current-page");
const contentContainer = document.getElementById("content");
const buttons = document.querySelectorAll("#page-buttons button");

const PAGE_MAP = {
    1: { html: "../html/pages/1.html", script: "scripts/pages/1.js" },
    2: { html: "../html/pages/2.html", script: "scripts/pages/2.js" },
    3: { html: "../html/pages/3.html", script: "scripts/pages/3.js" },
    4: { html: "../html/pages/4.html", script: "scripts/pages/4.js" }
};

async function LoadPage(pageNum) {
    const { html: htmlPath, script: scriptPath } = PAGE_MAP[pageNum];
    //pageDisplay.textContent = pageNum;

    // 1. Fetch and insert the new HTML
    const html = await fetch(chrome.runtime.getURL(htmlPath)).then(res => res.text());
    contentContainer.innerHTML = html;

    // 2. Load and run page script
    const module = await import(chrome.runtime.getURL(scriptPath));
    if (module && typeof module.init === "function") {
        module.init(); // re-initialize each time
    }
}

buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        const page = btn.id;
        console.log(page);
        LoadPage(page);
    });
});

// Load page 1 by default
LoadPage(1);
