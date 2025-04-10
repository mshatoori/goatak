// Date formatting
export function formatDateTime(str) {
    let d = new Date(Date.parse(str));
    return ("0" + d.getDate()).slice(-2) + "-" + 
           ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
           d.getFullYear() + " " + 
           ("0" + d.getHours()).slice(-2) + ":" + 
           ("0" + d.getMinutes()).slice(-2);
}

// UUID generation
export function generateUUID() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// Data cleaning removed - moved to store.js

// Store class removed - moved to store.js