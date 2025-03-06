# Balanz UI

This repository contains a UI for [balanz](https://github.com/ocpp-balanz/balanz), a Simple, yet feature-rich, CSMS or LC OCPP Server with Smart Charging Capabilities.

The application is based on React, Vite, and TypeScript. The UI provides some maintenance operations on the basic model concepts (Groups, Chargers, and Tags), live
charging status screens, as well as access to historic sessions.

While the UI is primarily intended for a normal-size browser screen, it is possible to access most screen also from a smaller device (e.g. a mobile phone).


## Installation

After cloning the repository, build and run balanz UI with:

```text
npm install
npm run dev
```

This brings up the standard Vite prompt. Open a browser to the correct URL by pressing `o`.

The balanz UI per default listens on port 8888. This can be changed in `vite.config.ts`. It connects per default to a balanz instance at `ws://localhost:9999/api`.
This can be updated by setting the balanz API endpoint in the `VITE_BALANZ_URL` environment variable before starting the UI.

To build and preview using a production build, execute:

```text
npm run build
npm run preview
```


## Docker

It is also possible to build and run the UI in containerized form. A simple `Dockerfile` is included. To build:

```text
docker build -t balanz-ui .
```

Note, that the `Dockerfile` simply runs the UI in the development mode. It is also possible to build the UI as a set of static HTML files and serve
these from a web-server. The `Dockerfile.static` file provides an example. 

Note: It would be possibel of course also to update the UI to use SSR (Server Side Rending) in a production setup.



