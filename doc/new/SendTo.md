Currently, when creating items, there is a checkbox with the text `ارسال` that indicates whether the item should be sent to others in the network or is only used locally (for the client himself, not others in the network).
This is done by having a boolean field called `send` in the payload of the "add unit" endpoint (POST `/unit`).
In the GET and POST handler of this endpoint, this field is serialized/deserialized from/to a `WebUnit`.
Internally in the backend, this field also exists on `Item` struct which is used to store and work with the items in the code. Items with `send=true` are broadcasted on all communication `CoTFlow`s.

Now, I want to improve this feature. I want the user to be able to choose to send the items they define on the map, to a destination of their choosing. So, instead of a checkbox, there should be a checkbox and a custom input of some sort for the target destination.
There are 2 types of destinations, that can be derived from `DnsServiceProxy`:

1. Subnet broadcast: We can only broadcast in subnets that we are a part of. So, we should query the DnsService to get all of our Addresses (by URN), and each of these addresses would indicate on of the subnets that we are part of.
2. Direct destination: These are all the addresses that are returned by DnsService, excluding our own addresses of course. Note that there may be many addresses for a single URN, these are the different addresses that a single client may have, and we should be able to select which IP we want to use to contact that URN. You could see this play out in `SendModal` in `send.js`.

Before implementing this, design your solution based on the current state of the code, and present your design so I could give you feedback on it.
