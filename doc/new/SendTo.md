Currently, when creating items, there is a checkbox with the text `ارسال` that indicates whether the item should be sent to others in the network or is only used locally (for the client himself, not others in the network).
This is done by having a boolean field called `send` in the payload of the "add unit" endpoint (POST `/unit`).
In the GET and POST handler of this endpoint, this field is serialized/deserialized from/to a `WebUnit`.
Internally in the backend, this field also exists on `Item` struct which is used to store and work with the items in the code. Items with `send=true` are broadcasted on all communication `CoTFlow`s.

Now, I want to improve this feature. I want the user to be able to choose to send the items they define on the map, to a destination of their choosing. So, instead of a checkbox, there should be a checkbox and a custom input of some sort for the target destination.
There are 2 types of destinations, that can be derived from `DnsServiceProxy`:

1. Subnet broadcast: We can only broadcast in subnets that we are a part of. So, we should query the DnsService to get all of our Addresses (by URN), and each of these addresses would indicate on of the subnets that we are part of.
2. Direct destination: These are all the addresses that are returned by DnsService, excluding our own addresses of course. Note that there may be many addresses for a single URN, these are the different addresses that a single client may have, and we should be able to select which IP we want to use to contact that URN. You could see this play out in `SendModal` in `send.js`.

Before implementing this, design your solution based on the current state of the code, and present your design so I could give you feedback on it.

Based on my comprehensive analysis of the codebase, I'll now design an enhanced destination selection solution that replaces the simple send checkbox with intelligent destination targeting.

## Enhanced Destination Selection Design

### 1. Frontend UI Enhancement

**Replace Simple Checkbox with Destination Selection Interface**

Instead of the current simple checkbox in [`UnitDetails.js`](staticfiles/static/js/components/UnitDetails.js:416-424):

```html
<!-- Current: Simple checkbox -->
<div class="form-check mb-3">
  <input
    class="form-check-input"
    type="checkbox"
    id="edit-send"
    v-model="editingData.send"
  />
  <label class="form-check-label" for="edit-send"> ارسال </label>
</div>
```

**Proposed Enhanced Interface:**

```html
<div class="mb-3">
  <label class="form-label"><strong>تنظیمات ارسال</strong></label>

  <!-- Send Mode Selection -->
  <div class="form-check">
    <input
      class="form-check-input"
      type="radio"
      id="send-none"
      v-model="editingData.sendMode"
      value="none"
    />
    <label class="form-check-label" for="send-none">عدم ارسال (محلی)</label>
  </div>

  <div class="form-check">
    <input
      class="form-check-input"
      type="radio"
      id="send-broadcast"
      v-model="editingData.sendMode"
      value="broadcast"
    />
    <label class="form-check-label" for="send-broadcast"
      >ارسال عمومی (همه شبکه‌ها)</label
    >
  </div>

  <div class="form-check">
    <input
      class="form-check-input"
      type="radio"
      id="send-subnet"
      v-model="editingData.sendMode"
      value="subnet"
    />
    <label class="form-check-label" for="send-subnet">ارسال زیرشبکه</label>
  </div>

  <div class="form-check">
    <input
      class="form-check-input"
      type="radio"
      id="send-direct"
      v-model="editingData.sendMode"
      value="direct"
    />
    <label class="form-check-label" for="send-direct">ارسال مستقیم</label>
  </div>

  <!-- Subnet Selection (shown when sendMode === 'subnet') -->
  <div v-if="editingData.sendMode === 'subnet'" class="mt-2 ms-4">
    <select v-model="editingData.selectedSubnet" class="form-select">
      <option value="" disabled>زیرشبکه را انتخاب کنید</option>
      <option
        v-for="subnet in availableSubnets"
        :value="subnet.address"
        :key="subnet.address"
      >
        {{ subnet.address }} ({{ subnet.description }})
      </option>
    </select>
  </div>

  <!-- Direct Destination Selection (shown when sendMode === 'direct') -->
  <div v-if="editingData.sendMode === 'direct'" class="mt-2 ms-4">
    <div class="row">
      <div class="col-6">
        <select
          v-model="editingData.selectedUrn"
          @change="onUrnSelected"
          class="form-select"
        >
          <option value="" disabled>مخاطب را انتخاب کنید</option>
          <option
            v-for="contact in availableContacts"
            :value="contact.urn"
            :key="contact.urn"
          >
            {{ contact.urn }} ({{ contact.callsign }})
          </option>
        </select>
      </div>
      <div class="col-6">
        <select
          v-model="editingData.selectedIpAddress"
          :disabled="!editingData.selectedUrn"
          class="form-select"
        >
          <option value="" disabled>IP را انتخاب کنید</option>
          <option v-for="ip in availableIps" :value="ip" :key="ip">
            {{ ip }}
          </option>
        </select>
      </div>
    </div>
  </div>
</div>
```

### 2. Frontend Data Structure Enhancement

**Enhanced editingData Structure:**

```javascript
// In startEditing() method
this.editingData = {
  // ... existing fields
  sendMode: this.item.sendMode || 'none',  // 'none', 'broadcast', 'subnet', 'direct'
  selectedSubnet: this.item.selectedSubnet || '',
  selectedUrn: this.item.selectedUrn || '',
  selectedIpAddress: this.item.selectedIpAddress || '',
  // ... other fields
};

// New computed properties
computed: {
  availableSubnets: function() {
    // Fetch our own addresses for subnet options
    return this.sharedState.ownAddresses || [];
  },
  availableContacts: function() {
    // Fetch other URNs for direct sending
    return this.sharedState.directDestinations || [];
  },
  availableIps: function() {
    if (!this.editingData.selectedUrn) return [];
    const contact = this.availableContacts.find(c => c.urn === this.editingData.selectedUrn);
    return contact ? contact.ip_address.split(',') : [];
  }
}
```

### 3. Backend API Enhancement

**Enhanced WebUnit Structure:**

```go
type WebUnit struct {
    // ... existing fields
    Send bool `json:"send"`  // Keep for backward compatibility

    // New destination fields
    SendMode         string `json:"sendMode"`         // "none", "broadcast", "subnet", "direct"
    SelectedSubnet   string `json:"selectedSubnet"`   // IP address for subnet broadcast
    SelectedUrn      int32  `json:"selectedUrn"`      // URN for direct sending
    SelectedIP       string `json:"selectedIP"`       // Specific IP for direct sending
}
```

**Enhanced Item Structure:**

```go
type Item struct {
    // ... existing fields
    send bool  // Keep existing for backward compatibility

    // New destination fields
    sendMode       string
    selectedSubnet string
    selectedUrn    int32
    selectedIP     string

    // ... existing fields
}

// New methods
func (i *Item) GetSendDestination() *model.SendItemDest {
    if i.sendMode == "direct" && i.selectedIP != "" {
        return &model.SendItemDest{
            Addr: i.selectedIP,
            URN:  int(i.selectedUrn),
        }
    }
    return nil
}

func (i *Item) GetSendMode() string {
    // Backward compatibility: map old boolean to new mode
    if i.sendMode == "" {
        if i.send {
            return "broadcast"
        }
        return "none"
    }
    return i.sendMode
}
```

### 4. Enhanced API Endpoints

**New Destination Options Endpoint:**

```go
// GET /destinations - Fetch available destination options
func getDestinationsHandler(app *App) air.Handler {
    return func(c air.Context) error {
        destinations := struct {
            OwnAddresses     []NodeAddress `json:"ownAddresses"`
            DirectDestinations []Contact     `json:"directDestinations"`
        }{}

        // Get our own addresses for subnet broadcast
        if ownAddrs, err := app.dnsServiceProxy.GetAddressByUrn(int(app.urn)); err == nil {
            destinations.OwnAddresses = ownAddrs
        }

        // Get all other addresses for direct destinations
        if allAddrs, err := app.dnsServiceProxy.GetAddresses(); err == nil {
            // Group by URN, exclude our own URN
            contactMap := make(map[int32]Contact)
            for _, addr := range allAddrs {
                if addr.Urn != nil && *addr.Urn != app.urn {
                    urn := *addr.Urn
                    contact := contactMap[urn]
                    if contact.URN == 0 {
                        contact.URN = urn
                        if addr.UnitName != nil {
                            contact.Callsign = *addr.UnitName
                        }
                    }
                    if addr.IPAddress != nil {
                        if contact.IPAddress == "" {
                            contact.IPAddress = *addr.IPAddress
                        } else {
                            contact.IPAddress += "," + *addr.IPAddress
                        }
                    }
                    contactMap[urn] = contact
                }
            }

            for _, contact := range contactMap {
                destinations.DirectDestinations = append(destinations.DirectDestinations, contact)
            }
        }

        return c.JSON(destinations)
    }
}
```

**Enhanced addItemHandler:**

```go
func addItemHandler(app *App) air.Handler {
    return func(c air.Context) error {
        var webUnit model.WebUnit
        if err := c.Bind(&webUnit); err != nil {
            return err
        }

        // ... existing item creation logic

        // Enhanced send logic
        switch webUnit.SendMode {
        case "broadcast":
            // Current behavior: send to all flows
            app.SendMsg(msg.GetTakMessage())

        case "subnet":
            // Send to specific subnet
            if webUnit.SelectedSubnet != "" {
                dest := model.SendItemDest{
                    Addr: webUnit.SelectedSubnet,
                    URN:  int(app.urn),  // Our own URN for subnet broadcast
                }
                app.SendMsgToDestination(msg.GetTakMessage(), dest)
            }

        case "direct":
            // Send to specific destination
            if webUnit.SelectedIP != "" && webUnit.SelectedUrn > 0 {
                dest := model.SendItemDest{
                    Addr: webUnit.SelectedIP,
                    URN:  int(webUnit.SelectedUrn),
                }
                app.SendMsgToDestination(msg.GetTakMessage(), dest)
            }

        case "none":
        default:
            // Don't send - local only
        }

        // ... rest of handler
    }
}
```

### 5. Enhanced CoTFlow Sending Mechanism

**New SendMsgToDestination Method:**

```go
func (app *App) SendMsgToDestination(msg *cotproto.TakMessage, dest model.SendItemDest) {
    // Use existing sendItemHandler pattern for destination-specific sending
    rabbitmq := app.defaultRabbitFlow
    if rabbitmq != nil {
        // Temporarily modify destinations
        prevDest := rabbitmq.Destinations
        rabbitmq.Destinations = []model.SendItemDest{dest}

        // Send to specific destination
        rabbitmq.SendCot(msg)

        // Restore original destinations
        rabbitmq.Destinations = prevDest
    }

    // For other flow types, implement destination-aware logic
    // or fall back to broadcast if destination targeting not supported
}
```

### 6. Visual Feedback Enhancement

**Enhanced getUnitName Method:**

```javascript
getUnitName: function (u) {
  let res = u.callsign || "no name";
  if (u.parent_uid === this.config.uid) {
    switch (u.sendMode || (u.send ? "broadcast" : "none")) {
      case "broadcast":
        res = "+ " + res;  // Broadcast to all
        break;
      case "subnet":
        res = "~ " + res;  // Subnet broadcast
        break;
      case "direct":
        res = "→ " + res;  // Direct send
        break;
      default:
        res = "* " + res;  // Local only
    }
  }
  return res;
}
```

### 7. Backward Compatibility

**Migration Strategy:**

- Keep existing `send` boolean field for backward compatibility
- Map `send=true` to `sendMode="broadcast"` and `send=false` to `sendMode="none"`
- Gradually migrate existing items to new structure
- Frontend gracefully handles both old and new data formats

### 8. Implementation Benefits

1. **Leverages Existing Infrastructure**: Uses proven `sendItemHandler` pattern and `model.SendItemDest`
2. **Follows Established Patterns**: Adopts SendModal's cascading selection UI
3. **Backward Compatible**: Existing functionality preserved
4. **DNS Service Integration**: Utilizes existing DNS service for destination discovery
5. **Flow-Aware**: Works with existing RabbitFlow destination capabilities
6. **User-Friendly**: Clear visual indicators and validation
7. **Extensible**: Easy to add new send modes or destination types

This design transforms the simple send checkbox into a comprehensive destination selection system while maintaining all existing functionality and leveraging the robust infrastructure already present in the codebase.
