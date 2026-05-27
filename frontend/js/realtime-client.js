(function () {
    const HUB_URL = 'http://localhost:7071/hubs/realtime';
    function debounce(callback, delay) {
        let timeoutId = null;
        return function (...args) {
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => callback.apply(this, args), delay);
        };
    }
    async function connect(options) {
        const settings = options || {};
        if (!window.signalR) {
            console.warn('SignalR client chưa được tải.');
            settings.onConnectionStateChange?.('missing');
            return null;
        }
        const notifyAnyChange = typeof settings.onAnyChange === 'function'
            ? debounce(settings.onAnyChange, settings.debounceMs || 250)
            : null;
        const connection = new window.signalR.HubConnectionBuilder()
            .withUrl(HUB_URL)
            .withAutomaticReconnect()
            .build();
        settings.onConnectionStateChange?.('connecting');
        connection.on('tableChanged', (payload) => {
            settings.onTableChanged?.(payload);
            notifyAnyChange?.({ type: 'tableChanged', payload });
        });
        connection.on('reservationChanged', (payload) => {
            settings.onReservationChanged?.(payload);
            notifyAnyChange?.({ type: 'reservationChanged', payload });
        });
        connection.on('orderChanged', (payload) => {
            settings.onOrderChanged?.(payload);
            notifyAnyChange?.({ type: 'orderChanged', payload });
        });
        connection.onreconnecting(() => {
            settings.onConnectionStateChange?.('reconnecting');
        });
        connection.onreconnected(() => {
            settings.onConnectionStateChange?.('connected');
        });
        connection.onclose(() => {
            settings.onConnectionStateChange?.('disconnected');
        });
        try {
            await connection.start();
            console.info('Realtime connected:', HUB_URL);
            settings.onConnectionStateChange?.('connected');
            return connection;
        } catch (error) {
            console.warn('Không thể kết nối realtime:', error);
            settings.onConnectionStateChange?.('disconnected');
            return null;
        }
    }
    window.RestaurantRealtime = {
        connect
    };
})();
