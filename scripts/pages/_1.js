export function init() {
    document.getElementById('tab-group-dropdown').addEventListener('click', async () => {
        console.log("hallo");
    });

    document.getElementById('create-group').addEventListener('click', async () => {
        // Query all tabs in the current window
        await createTabGroup();
    });

    document.getElementById('close-group').addEventListener('click', async () => {
        // Get the active tab in the current window
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
            alert('You are not in a tab group.');
            return;
        }

        // Get all tabs in the current group and remove them
        // Note: This will close all tabs in the group. If no other tags are in the 
        // group, the entire window will close.
        const tabsInGroup = await chrome.tabs.query({ groupId: tab.groupId });
        const tabIds = tabsInGroup.map(t => t.id);
        if (tabIds.length > 0) {
            await chrome.tabs.remove(tabIds);
        }
    
    });


    document.getElementById('new-session').addEventListener('click', async () => {
        // Get existing tab groups first
        const groups = await getTabGroups();

        // Remove previous dropdown/button if it exists
        const prevDropdown = document.getElementById('tab-group-dropdown');
        if (prevDropdown) prevDropdown.remove();
        const prevBtn = document.getElementById('open-group-btn');
        if (prevBtn) prevBtn.remove();

        if (groups.length > 0) {
            // Show dropdown with existing tab groups
            const dropdown = document.createElement('select');
            dropdown.id = 'tab-group-dropdown';
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.title || `Group ${group.id}`;
                dropdown.appendChild(option);
            });

            const openBtn = document.createElement('button');
            openBtn.textContent = 'Start Session';
            openBtn.id = 'open-group-btn';

            document.body.appendChild(dropdown);
            document.body.appendChild(openBtn);

            openBtn.addEventListener('click', async () => {
                // A new window will be created with the selected tab group. The 
                // issue is that the new window gets forced closed when the 
                // selected tab group gets opened.
            });
        } else {
            // No groups exist, create a tab group in a new window
            // Same issue as above, the new window gets closed when the 
            // tab group is opened.
            // const newWindow = await chrome.windows.create({});
            // await chrome.windows.update(newWindow.id, { focused: true });
            const [tab] = await chrome.tabs.query({ windowId: newWindow.id });
            if (tab) {
                const groupId = await chrome.tabs.group({ tabIds: [tab.id] });
                await chrome.tabGroups.update(groupId, { title: "Study", color: "blue" });
            }
        }
    });
}

async function createTabGroup() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
        // Create a new group with the current tab
        const groupId = await chrome.tabs.group({ tabIds: [tab.id] });
    }
    
}

async function getTabGroups() {
    const groups = await chrome.tabGroups.query({});
    return groups;
}
