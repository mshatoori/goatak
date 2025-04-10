// front/src/apiService.js
import { generateUUID } from './utils';
import { cleanUnit } from './store';

// --- Unit API --- //
export async function fetchUnits() {
    try {
        const response = await fetch('/api/unit');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error('Error fetching units:', error);
        throw error; // Re-throw to allow calling components to handle
    }
}

export async function createUnit(unit) {
    try {
        const cleanedUnit = typeof cleanUnit === 'function' ? cleanUnit(unit) : unit;
        const response = await fetch('/api/unit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanedUnit)
        });
        if (!response.ok) {
             let errorMsg = `HTTP error! status: ${response.status}`;
             try {
                  const errorData = await response.json();
                  errorMsg = errorData.message || errorData.error || errorMsg;
             } catch (e) { /* Ignore */ }
             throw new Error(errorMsg);
        }
        if (response.status === 204) { 
            return null; 
        }
        return response.json();
    } catch (error) {
        console.error('Error creating/updating unit:', error);
        throw error;
    }
}

export async function deleteUnit(uid) {
    try {
        const response = await fetch(`/api/unit/${uid}`, { method: 'DELETE' });
        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
             try {
                  const errorData = await response.json();
                  errorMsg = errorData.message || errorData.error || errorMsg;
             } catch (e) { /* Ignore if body isn't JSON */ }
             throw new Error(errorMsg);
        }
        if (response.status === 204) { 
            return null; 
        }
        return response.json(); // Assuming delete might return details
    } catch (error) {
        console.error('Error deleting unit:', error);
        throw error;
    }
}

// --- Sensor API --- //
export async function fetchSensors() {
    try {
        const response = await fetch('/api/sensors');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error('Error fetching sensors:', error);
        throw error;
    }
}

export async function createSensor(sensorData) {
    const sensorJson = {
        uid: sensorData.uid || generateUUID(),
        name: sensorData.name,
        type: sensorData.type,
        host: sensorData.host,
        port: parseInt(sensorData.port, 10),
        interval: parseInt(sensorData.interval, 10)
    };

    if (isNaN(sensorJson.port) || isNaN(sensorJson.interval)) {
        const error = new Error("Invalid port or interval provided for sensor.");
        console.error(error.message, sensorData);
        throw error;
    }

    try {
        const response = await fetch('/api/sensors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sensorJson)
        });
         if (!response.ok) {
             let errorMsg = `HTTP error! status: ${response.status}`;
             try {
                  const errorData = await response.json();
                  errorMsg = errorData.message || errorData.error || errorMsg;
             } catch (e) { /* Ignore */ }
             throw new Error(errorMsg);
        }
         if (response.status === 204) { 
            return null; 
        }
        return response.json();
    } catch (error) {
        console.error('Error creating sensor:', error);
        throw error;
    }
}

export async function deleteSensor(uid) {
    try {
        const response = await fetch(`/api/sensors/${uid}`, { method: 'DELETE' });
        if (!response.ok) {
            let errorMessage = `Failed to delete sensor (status: ${response.status})`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (e) { /* Ignore if response is not JSON */ }
            throw new Error(errorMessage);
        }
        if (response.status === 204) {
            return null; // Standard practice for successful DELETE with no body
        }
        return response.json(); // Or handle unexpected body
    } catch (error) {
        console.error('Error deleting sensor:', error);
        throw error;
    }
}

// --- Feed API --- //
export async function fetchFeeds() {
    try {
        const response = await fetch('/api/feeds');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error('Error fetching feeds:', error);
        throw error;
    }
}

export async function createFeed(feedData) {
    try {
        const response = await fetch('/api/feeds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feedData) // Assume feedData is already structured correctly
        });
         if (!response.ok) {
             let errorMsg = `HTTP error! status: ${response.status}`;
             try {
                  const errorData = await response.json();
                  errorMsg = errorData.message || errorData.error || errorMsg;
             } catch (e) { /* Ignore if body isn't JSON */ }
             throw new Error(errorMsg);
        }
         if (response.status === 204) { 
            return null; 
        }
        return response.json();
    } catch (error) {
        console.error('Error creating feed:', error);
        throw error;
    }
} 