/**
 * Fetches distracting domains from storage and displays them in a list.
 * Each item in the list has a delete button.
 */
function displayAndDeleteDistractingDomains() {
    const container = document.getElementById('distracting-domains-container');
    container.innerHTML = ''; // Clear previous list

    chrome.storage.sync.get(['distractingDomains'], (result) => {
        const domains = result.distractingDomains || [];

        if (domains.length === 0) {
            container.textContent = "You haven't marked any sites as distracting yet.";
            return;
        }

        const ul = document.createElement('ul');
        domains.forEach(domain => {
            const li = document.createElement('li');

            const domainText = document.createElement('span');
            domainText.textContent = domain;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'delete-btn';

            // Add event listener to the delete button
            deleteBtn.addEventListener('click', () => {
                deleteDomain(domain);
            });

            li.appendChild(domainText);
            li.appendChild(deleteBtn);
            ul.appendChild(li);
        });

        container.appendChild(ul);
    });
}

/**
 * Deletes a specific domain from the distracting domains list in storage,
 * and then re-renders the list.
 * @param {string} domainToDelete The domain to remove.
 */
function deleteDomain(domainToDelete) {
    const storageKey = "distractingDomains";
    chrome.storage.sync.get([storageKey], (result) => {
        const domains = result[storageKey] || [];
        // Filter out the domain to be deleted
        const updatedDomains = domains.filter(d => d !== domainToDelete);

        // Save the updated list back to storage
        chrome.storage.sync.set({ [storageKey]: updatedDomains }, () => {
            console.log(`Deleted ${domainToDelete} from distracting domains list.`);
            // Refresh the list view to show the change
            displayAndDeleteDistractingDomains();
        });
    });
}

/**
 * Adds a new domain to the distracting domains list from manual input.
 */
function addDomainManually() {
    const input = document.getElementById('manual-domain-input');
    const message = document.getElementById('manual-add-message');
    let domain = input.value.trim();

    if (!domain) {
        message.textContent = "Please enter a domain.";
        message.style.color = 'red';
        return;
    }

    // If a full URL is pasted, extract the hostname
    try {
        if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
            domain = 'https://' + domain;
        }
        const url = new URL(domain);
        domain = url.hostname;
    } catch (error) {
        message.textContent = "Invalid domain or URL format.";
        message.style.color = 'red';
        return;
    }


    const storageKey = "distractingDomains";
    chrome.storage.sync.get([storageKey], (result) => {
        const domains = result[storageKey] || [];
        if (domains.includes(domain)) {
            message.textContent = "This domain is already in the list.";
            message.style.color = 'orange';
        } else {
            domains.push(domain);
            domains.sort();
            chrome.storage.sync.set({ [storageKey]: domains }, () => {
                message.textContent = `Successfully blocked ${domain}.`;
                message.style.color = 'green';
                displayAndDeleteDistractingDomains(); // Refresh the list
            });
        }
        input.value = ""; // Clear input field
    });
}

/**
 * Imports distracting domains from a user-selected CSV file.
 */
function importDomainsFromFile() {
    const fileInput = document.getElementById('import-file-input');
    const message = document.getElementById('import-message');
    const file = fileInput.files[0];

    if (!file) {
        message.textContent = "Please select a file to import.";
        message.style.color = 'red';
        return;
    }

    if (!file.name.endsWith('.csv')) {
        message.textContent = "Only .csv files are supported at this time.";
        message.style.color = 'red';
        return;
    }

    const reader = new FileReader();

    // When the file is successfully read
    reader.onload = function (event) {
        // Get the file contents as text
        const csvContent = event.target.result;

        // Split the file into lines, trim each line, and filter out empty lines
        const domainsToAdd = csvContent.split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            // For each line, try to extract the hostname (domain)
            .map(domain => {
                try {
                    let cleanDomain = domain;
                    // If the line doesn't start with http/https, add https:// to the beginning
                    if (!cleanDomain.startsWith('http://') && !cleanDomain.startsWith('https://')) {
                        cleanDomain = 'https://' + cleanDomain;
                    }
                    return new URL(cleanDomain).hostname;
                } catch (e) {
                    return null;
                }
            })
            // Remove any nulls (invalid domains)
            .filter(domain => domain !== null);

        // If no valid domains found, show a message and exit
        if (domainsToAdd.length === 0) {
            message.textContent = "No valid domains found in the file.";
            message.style.color = 'red';
            return;
        }

        const storageKey = "distractingDomains";
        // Get the current list of distracting domains from storage
        chrome.storage.sync.get([storageKey], (result) => {
            const existingDomains = result[storageKey] || [];
            // Merge new domains with existing, removing duplicates
            const newDomains = [...new Set([...existingDomains, ...domainsToAdd])];
            newDomains.sort();

            // Save the updated list back to storage
            chrome.storage.sync.set({ [storageKey]: newDomains }, () => {
                // Show how many new domains were added
                const addedCount = newDomains.length - existingDomains.length;
                message.textContent = `Successfully imported ${addedCount} new domains.`;
                message.style.color = 'green';
                // Refresh the displayed list
                displayAndDeleteDistractingDomains();
            });
        });
    };
    reader.onerror = function () {
        message.textContent = "Error reading the file.";
        message.style.color = 'red';
    };

    reader.readAsText(file);
    fileInput.value = ''; // Clear file input
}


/**
 * The init function that is called by main.js when this page is loaded.
 */
export function init() {
    // Initial call to display the domains when the page loads
    displayAndDeleteDistractingDomains();

    // Set up the PIN setting functionality
    const pinInput = document.getElementById('pin-input');
    const pinConfirm = document.getElementById('pin-confirm');
    const setPinBtn = document.getElementById('set-pin');
    const pinMessage = document.getElementById('pin-message');

    setPinBtn.addEventListener('click', () => {
        const pin = pinInput.value;
        const confirm = pinConfirm.value;

        if (pin.length < 4) {
            pinMessage.textContent = "PIN must be at least 4 digits.";
            pinMessage.style.color = 'red';
            return;
        }

        if (pin !== confirm) {
            pinMessage.textContent = "PINs do not match.";
            pinMessage.style.color = 'red';
            return;
        }

        chrome.storage.local.set({ unlockPin: pin }, () => {
            pinMessage.textContent = "PIN set successfully!";
            pinMessage.style.color = 'green';
            pinInput.value = "";
            pinConfirm.value = "";
        });
    });

    // Set up the manual domain adding functionality
    const addDomainBtn = document.getElementById('add-domain-btn');
    addDomainBtn.addEventListener('click', addDomainManually);

    // Set up the import from file functionality
    const importBtn = document.getElementById('import-btn');
    importBtn.addEventListener('click', importDomainsFromFile);
}