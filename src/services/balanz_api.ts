type BalanzResult = [number, any];
type CallFunction = {
    resolve: Function;
};

export default class BalanzAPI {
    ws: WebSocket;
    outstanding_calls: Map<string, CallFunction>;
    logged_in: boolean;
    dummy: boolean;

    constructor(url: string) {
        this.ws = new WebSocket(url, ["ocpp1.6"]);
        this.outstanding_calls = new Map<string, CallFunction>();
        this.logged_in = false;
        if (url == "") {
            console.log('dummy BalanzAPI constructor');
            this.dummy = true;
            return;
        }
        this.dummy = false;

        this.ws.onclose = () => {
            console.log('balanz WebSocket closed');
        };

        this.ws.onopen = () => {
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

    call_async(command: string, payload: unknown, callback: Function): void {
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

    async login(token: string): Promise<boolean> {
        const [ok, payload] = await this.call("Login", {"token": token});
        if (ok == 3) {
            console.log("Succesfully logged in");
            this.logged_in = true;
            return true;
        } else {
            console.log("Login failed", payload);
            return false;
        }
    }
}