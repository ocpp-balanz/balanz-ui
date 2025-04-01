import { Dispatch, SetStateAction } from "react";
import { CONN_STATE } from '../types/types';

type BalanzResult = [number, any];
type CallFunction = {
    resolve: Function;
};

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default class BalanzAPI {
    ws: WebSocket|null;
    outstanding_calls: Map<string, CallFunction>;
    logged_in: boolean = false;
    logged_in_user_type: string = "";
    token: string;
    url: string;
    connected: boolean = false;
    setConnState: Dispatch<SetStateAction<CONN_STATE>>|null;

    constructor(url: string) {
        this.url = url;
        this.token = "";
        this.outstanding_calls = new Map<string, CallFunction>();
        this.logged_in = false;
        this.logged_in_user_type = "";
        this.connected = false;
        this.setConnState = null;
        this.ws = null;
    }

    set_connstate_func(setConnState: Dispatch<SetStateAction<CONN_STATE>>) {
        this.setConnState = setConnState;
        console.log("ConnStatefunc set");
        if (this.connected)
            setConnState(CONN_STATE.CONNECTED);
    }

    private async _wait_connected(): Promise<void> {
        for (let i = 0; i < 30; i++) {
            await sleep(100);
            if (this.connected)
                break;
        }
    }

    async reconnect(): Promise<void> {
        while (true) {
            // Let's attempt to reconnect, but wait first
            await sleep(5000);
            
            // Then login again
            console.log(this);
            this.connect();
            await this._wait_connected();
            if (this.connected) {
                console.log("Reconnected OK.");

                if (this.token != "") {
                    // Otherwise, let's try to also login again.
                    this.logged_in_user_type = await this.login(this.token);
                    console.log("Succesfully logged in again");
                    if (this.logged_in_user_type == "") {
                        console.log("Failed to login again.");
                    }
                }

                break;
            }
        }
    }

    connect(): void {
        this.ws = new WebSocket(this.url, ["ocpp1.6"]);

        this.ws.onclose = () => {
            this.connected = false;
            this.logged_in = false;
            if (this.setConnState)
                this.setConnState(CONN_STATE.NOT_CONNECTED);
            console.log('balanz WebSocket closed');

            // Set up timer to try reconneting
            this.reconnect();
        };

        this.ws.onopen = () => {
            this.connected = true;
            if (this.setConnState)
                this.setConnState(CONN_STATE.CONNECTED);
            console.log('balanz WebSocket connected');
        };

        this.ws.onerror = () => {
            if (this.setConnState)
                this.setConnState(CONN_STATE.NOT_CONNECTED);
            console.log('balanz WebSocket error');
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
    }

    static gen_message_id(): string {
        const min_id = 1000
        const max_id = 9999
        return (Math.floor(Math.random() * (max_id - min_id + 1)) + min_id).toString();
    }

    static dummy(data: any): void {
        console.log("dummy called. LOGIC ERROR", data)
    }


    async call(command: string, payload: any): Promise<BalanzResult> {
        if (!this.connected || !this.ws)
            return [0, null];
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
        if (!this.connected || !this.ws)
            return;
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
            if (this.setConnState)
                this.setConnState(CONN_STATE.LOGGED_IN);
            return this.logged_in_user_type;
        } else {
            console.log("Login failed", payload);
            return "";
        }
    }
}