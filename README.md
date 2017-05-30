# Phoenix Channels Client
This is the Node.js client. If you need a client for the browser use [phoenix](https://www.npmjs.com/package/phoenix)

The differece with the original client is that this does not use long-polling and you need to pass the absolute url instead of the relative url.

# Usage
This uses the same API as the original [phoenix](https://www.npmjs.com/package/phoenix) except that it needs an absolute url
```javascript
const { Socket } = require('phoenix-channels')

let socket = new Socket("ws://example.com/socket")

socket.connect()

// Now that you are connected, you can join channels with a topic:
let channel = socket.channel("room:lobby", {})
channel.join()
  .receive("ok", resp => { console.log("Joined successfully", resp) })
  .receive("error", resp => { console.log("Unable to join", resp) })
```

`Presence` is also available

# Installation
`npm install --save phoenix-channels`

# Authors
API was made by authors of the [Phoenix Framework](http://www.phoenixframework.org/)
- see their website for complete list of authors.

Ported to Node.js by Mario Campa

# License

The same as [Phoenix Framework](http://www.phoenixframework.org/) (MIT)