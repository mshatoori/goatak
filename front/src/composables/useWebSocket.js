import { ref, onUnmounted } from 'vue';

export function useWebSocket(onMessageCallback) {
    const connectionStatus = ref(false);
    const ws = ref(null);
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    let reconnectTimeoutId = null; // To keep track of the timeout

    const connect = () => {
        // Prevent multiple connections
        if (ws.value && ws.value.readyState === WebSocket.OPEN) {
            console.log("WebSocket already connected.");
            return;
        }
        // Clear any existing reconnect timeout
        if (reconnectTimeoutId) {
            clearTimeout(reconnectTimeoutId);
            reconnectTimeoutId = null;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        console.log(`Attempting WebSocket connection to ${wsUrl}...`);

        ws.value = new WebSocket(wsUrl);

        ws.value.onopen = () => {
            console.log("WebSocket connection established.");
            connectionStatus.value = true;
            reconnectAttempts = 0; // Reset attempts on successful connection
        };

        ws.value.onclose = (event) => {
            console.warn(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason}. Attempting reconnect...`);
            connectionStatus.value = false;
            ws.value = null; // Clear the ref

            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectTimeoutId = setTimeout(() => {
                    reconnectAttempts++;
                    console.log(`WebSocket reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
                    connect(); // Retry connection
                }, 5000 * Math.pow(2, reconnectAttempts)); // Exponential backoff
            } else {
                console.error("WebSocket maximum reconnect attempts reached.");
            }
        };

        ws.value.onerror = (error) => {
            console.error('WebSocket error:', error);
            // onclose will likely be called after an error, triggering the reconnect logic
        };

        ws.value.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // console.log("WebSocket message received:", data);
                if (onMessageCallback && typeof onMessageCallback === 'function') {
                    onMessageCallback(data); // Pass parsed data to the callback
                }
            } catch (error) {
                console.error("Error parsing WebSocket message:", error, "Original data:", event.data);
            }
        };
    };

    const disconnect = () => {
        // Clear reconnect timeout if disconnect is called explicitly
        if (reconnectTimeoutId) {
            clearTimeout(reconnectTimeoutId);
            reconnectTimeoutId = null;
        }
        reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent automatic reconnections after explicit disconnect

        if (ws.value) {
            console.log("Closing WebSocket connection explicitly.");
            ws.value.close();
            ws.value = null;
        }
        connectionStatus.value = false;
    };

    const sendMessage = (payload) => {
        if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
            console.error("Cannot send message: WebSocket is not connected or ready.");
            return false;
        }
        try {
            const messageString = JSON.stringify(payload);
            // console.log("Sending WebSocket message:", messageString);
            ws.value.send(messageString);
            return true;
        } catch (error) {
            console.error("Error sending WebSocket message:", error, "Payload:", payload);
            return false;
        }
    };

    // Automatically disconnect when the component using the composable is unmounted
    onUnmounted(() => {
        disconnect();
    });

    // Return the state and methods
    return {
        connectionStatus,
        connect,
        disconnect,
        sendMessage // Expose the send message function
    };
} 