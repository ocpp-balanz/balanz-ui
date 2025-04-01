type BalanzResult = [number, any];
type CallFunction = {
    resolve: Function;
};


function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default class BalanzAPI {
    ws: WebSocket;
    outstanding_calls: Map<string, CallFunction>;
    logged_in: boolean = false;
    logged_in_user_type: string = "";
    token: string;
    url: string;
    connected: boolean = false;

    constructor(url: string) {
        this.url = url;
        this.token = "";
        this.outstanding_calls = new Map<string, CallFunction>();
        this.ws = this._connect();
    }

    private async _wait_connected(): Promise<void> {
        for (let i = 0; i < 30; i++) {
            await sleep(100);
            if (this.connected)
                break;
        }
    }

    private _connect(): Websocket {
        this.logged_in = false;
        this.logged_in_user_type = "";
        this.connected = false;
        this.ws = new WebSocket(this.url, ["ocpp1.6"]);

        this.ws.onclose = () => {
            this.connected = false;
            this.logged_in = false;
            console.log('balanz WebSocket closed');
        };

        this.ws.onopen = () => {
            this.connected = true;
            console.log('balanz WebSocket connected');
        };
    
        this.ws.onmessage = (evt) => {
            const message = (evt.data);
            const result = JSON.parse(message)
            if (result.length != 3) {
                // Ups.
                console.log("ERROR in response. Don't know that to do");
                console.log(message);
            } else {
                const [result_type, message_id, payload] = JSON.parse(message);

                if (this.outstanding_calls.has(message_id)) {
                    const call = this.outstanding_calls.get(message_id);
                    const result: BalanzResult = [result_type, payload];
                    call?.resolve(result);
                    this.outstanding_calls.delete(message_id);
                } else {
                    console.log("No matching message_id. Throwing response away.");
                }
            }
        };
        return this.ws;
    }

    static gen_message_id(): string {
        const min_id = 1000
        const max_id = 9999
        return (Math.floor(Math.random() * (max_id - min_id + 1)) + min_id).toString();
    }

    static dummy(data: any): void {
        console.log("dummy called. LOGIC ERROR", data)
    }

    async reconnect(): Promise<boolean> {
        if (this.token == "")
            return false; // no stored token. Would not be able to login.

        // Try for some time before giving up.
        for (let i = 0; i < 15; i++) {
            // Then login again
            this.ws.close();
            this._connect();
            await this._wait_connected();
            if (!this.connected) {
                await sleep(5000);  // Add delay to avoid reconnecting immediately
                console.log("Reconnection failed. Trying again in 5 seconds.");
            }
            this.logged_in_user_type = await this.login(this.token);
            if (this.logged_in_user_type == "") {
                console.log("Failed to login again.");
                return false;
            }

            console.log("Succesfully reconnected and logged in again");
            return true;
        }
        return false;
    }

    async call(command: string, payload: any): Promise<BalanzResult> {
        if (!this.connected) {
            const ok: boolean = await this.reconnect();
            if (!ok) {
                console.log("Failed to reconnect.");
                return [0, null];
            }
        }
        const message_id = BalanzAPI.gen_message_id();
        try {
            const call_function: CallFunction = {resolve: BalanzAPI.dummy};
            this.outstanding_calls.set(message_id, call_function);

            // Prepare callback for result
            const callback = new Promise<BalanzResult>((resolve) => {
                call_function.resolve = resolve;
            });

            // Send the command and await the response
            this.ws.send(JSON.stringify([2, message_id, command, payload]));
            return callback;
        } finally {
            // nop
        }
    }

    async call_async(command: string, payload: unknown, callback: Function): Promise<void> {
        if (!this.connected) {
            const ok: boolean = await this.reconnect();
            if (!ok) {
                console.log("Failed to reconnect.");
                return;
            }
        }
        const message_id = BalanzAPI.gen_message_id();
        try {
            const call_function: CallFunction = {resolve: BalanzAPI.dummy};
            this.outstanding_calls.set(message_id, call_function);

            // Prepare callback for result
            call_function.resolve = callback;

            this.ws.send(JSON.stringify([2, message_id, command, payload]));
        } finally {
            // nop
        }
    }

    async login(token: string): Promise<string> {
        const [ok, payload] = await this.call("Login", {"token": token});
        if (ok == 3) {
            this.logged_in = true;
            this.logged_in_user_type = payload["user_type"];
            console.log("Succesfully logged in as " + this.logged_in_user_type);
            this.token = token;
            return this.logged_in_user_type;
        } else {
            console.log("Login failed", payload);
            return "";
        }
    }
}