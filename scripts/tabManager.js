/* Create group constants for grouping tabs as "Productive" or "Distracting". */
const DISTRACTING = {
    TITLE: "Distracting",
    COLOR: "red"
}

const PRODUCTIVE = {
    TITLE: "Productive",
    COLOR: "green"
}

/* Create context menu items for marking "Productive" and "Distracting" tabs. */
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "markProductive",
        title: `Mark as ${PRODUCTIVE.TITLE}`,
        contexts: ["all"]
    });

    chrome.contextMenus.create({
        id: "markDistracting",
        title: `Mark as ${DISTRACTING.TITLE}`,
        contexts: ["all"]
    });
});

/* Handle context menu clicks to mark tabs as "Productive" or "Distracting". */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    // A tab might be closed between the right-click and the menu selection.
    try {
        await chrome.tabs.get(tab.id);
        if (info.menuItemId === "markProductive") {
            await groupTab(tab, true);
        } else if (info.menuItemId === "markDistracting") {
            await groupTab(tab, false);
        }
    } catch (error) {
        console.log("Tab not found, it was likely closed before the action could complete.");
    }
});

/* Function to group a tab as either "Productive" or "Distracting". */
async function groupTab(tab, isProductive) {
    const groupInfo = isProductive ? PRODUCTIVE : DISTRACTING;
    const groupTitle = groupInfo.TITLE;
    const groupColor = groupInfo.COLOR;

    try {
        const existingGroups = await chrome.tabGroups.query({ title: groupTitle, windowId: tab.windowId });

        let groupId;
        if (existingGroups.length > 0) {
            groupId = existingGroups[0].id;
        } else {
            const newGroupId = await chrome.tabs.group({ tabIds: [tab.id] });
            await chrome.tabGroups.update(newGroupId, {
                title: groupTitle,
                color: groupColor
            });
            groupId = newGroupId;
        }

        await chrome.tabs.group({
            tabIds: [tab.id],
            groupId: groupId
        });

        // If the tab is marked as distracting, save both its domain and its specific info.
        if (!isProductive) {
            // Call both save functions
            saveDomainAsDistracting(tab.url);
            saveTabAsDistracting(tab);
        }

    } catch (error) {
        console.error("Error grouping tab:", error);
    }
}

/**
 * Saves the distracting tab's domain to chrome.storage.sync.
 * @param {string} urlString The URL of the tab.
 */
function saveDomainAsDistracting(urlString) {
    if (!urlString || !urlString.startsWith('http')) {
        return;
    }
    const url = new URL(urlString);
    const domain = url.hostname;
    const storageKey = "distractingDomains";

    chrome.storage.sync.get([storageKey], (result) => {
        const domains = result[storageKey] || [];
        if (!domains.includes(domain)) {
            domains.push(domain);
            domains.sort();
            chrome.storage.sync.set({ [storageKey]: domains }, () => {
                console.log(`Saved ${domain} to distracting domains list.`);
            });
        }
    });
}

/**
 * Deletes a domain from the distracting domains list in chrome.storage.sync.
 * @param {string} domain The domain to delete.
 */
function deleteDomainFromDistracting(domain) {
    const storageKey = "distractingDomains";
    chrome.storage.sync.get([storageKey], (result) => {
        const domains = result[storageKey] || [];
        const updatedDomains = domains.filter(d => d !== domain);
        chrome.storage.sync.set({ [storageKey]: updatedDomains }, () => {
            console.log(`Deleted ${domain} from distracting domains list.`);
        });
    });
}

/**
 * Checks if a domain is in the distracting domains list.
 * @param {string} domain The domain to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the domain is distracting, false otherwise.
 */
function isDomainDistracting(domain) {
    const storageKey = "distractingDomains";
    return new Promise((resolve) => {
        chrome.storage.sync.get([storageKey], (result) => {
            const domains = result[storageKey] || [];
            resolve(domains.includes(domain));
        });
    });
}

/**
 * Saves the distracting tab's URL and Title to chrome.storage.sync.
 * @param {chrome.tabs.Tab} tab The tab object to save.
 */
function saveTabAsDistracting(tab) {
    if (!tab.url || !tab.url.startsWith('http')) {
        return;
    }

    const storageKey = "distractingTabs";
    const newTabInfo = {
        url: tab.url,
        title: tab.title
    };

    chrome.storage.sync.get([storageKey], (result) => {
        const tabs = result[storageKey] || [];
        const isAlreadySaved = tabs.some(savedTab => savedTab.url === newTabInfo.url);

        if (!isAlreadySaved) {
            tabs.push(newTabInfo);
            chrome.storage.sync.set({ [storageKey]: tabs }, () => {
                console.log(`Saved ${newTabInfo.url} to distracting tabs list.`);
            });
        }
    });
}

/**
 * Deletes a tab from the distracting tabs list in chrome.storage.sync.
 * @param {chrome.tabs.Tab} tab The tab object to delete.
 */
function deleteTabFromDistracting(tab) {
    const storageKey = "distractingTabs";
    chrome.storage.sync.get([storageKey], (result) => {
        const tabs = result[storageKey] || [];
        const updatedTabs = tabs.filter(savedTab => savedTab.url !== tab.url);
        chrome.storage.sync.set({ [storageKey]: updatedTabs }, () => {
            console.log(`Deleted ${tab.url} from distracting tabs list.`);
        });
    });
}

chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, async (tab) => {
        if (tab.url) {
            const url = new URL(tab.url);
            const domain = url.hostname;

            // Don't lock the extension's own pages.
            if (url.protocol === 'chrome-extension:') {
                return;
            }

            const isDistracting = await isDomainDistracting(domain);
            if (!isDistracting) {
                return;
            }

            // Check if the tab is already unlocked in this session
            const sessionKey = `unlocked_${domain}`;
            const sessionResult = await chrome.storage.session.get([sessionKey]);
            if (sessionResult[sessionKey]) {
                console.log(`${domain} is distracting but already unlocked this session.`);
                return;
            }


            console.log(`${domain} is distracting.`);
            // Redirect to the locked page
            chrome.tabs.update(tab.id, {
                url: chrome.runtime.getURL('html/locked.html') + '?url=' + encodeURIComponent(tab.url)
            });
        }
    });
});



// Timer -------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "START_TIMER") {
        chrome.alarms.create("LockedInSession", {
            when: Date.now() + message.duration
        });
        chrome.storage.local.set({ StartingTime: Date.now() });

        console.log("created timer");
    }
    else if (message.type === "PAUSE_TIMER") {
        chrome.alarms.clear("LockedInSession");
        chrome.storage.local.get(["StartingTime", "RemainingTime"], (data) => {
            const elapsedTime = Date.now() - data.StartingTime;
            chrome.storage.local.set({ RemainingTime: (data.RemainingTime - elapsedTime) });
            // console.log(data.TotalTime - elapsedTime);
        });

        console.log("Alarm \"Paused\"");
    }
    else if (message.type === "CONTINUE_TIMER") {
        chrome.storage.local.get(["RemainingTime"], (data) => {
            chrome.alarms.create("LockedInSession", {
                when: Date.now() + data.RemainingTime
            });

            chrome.storage.local.set({ StartingTime: Date.now() });
        });
    }

    sendResponse();
    return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "LockedInSession") {
        console.log("Lockdown timer ended!");

        chrome.windows.create({
            url: "../html/alert.html",
            type: "popup",
            width: 400,
            height: 200
        });
    }
});